import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';

import {
  CONTRACT_VERSION,
  ErrorCodes,
  createRequestEnvelope,
  createResponseEnvelope,
  createError,
  findEditorExecutable,
  validatePathForOpen,
  resolveNewDestination,
  launchEditor,
  sendEnvelope,
  pingEditor,
  EditorClient,
} from './contract.mjs';

const testDir = join(tmpdir(), 'mdedit-test-' + Date.now());

test.before(() => {
  mkdirSync(testDir, { recursive: true });
});

test.after(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

test('CONTRACT_VERSION is defined and equals 1.0.0', () => {
  assert.equal(typeof CONTRACT_VERSION, 'string');
  assert.equal(CONTRACT_VERSION, '1.0.0');
});

test('request and response envelopes contain contract version and request IDs', () => {
  const req = createRequestEnvelope('open', { path: '/tmp/test.md' }, 'custom-id-123');
  assert.equal(req.version, '1.0.0');
  assert.equal(req.id, 'custom-id-123');
  assert.equal(req.cmd, 'open');

  const resp = createResponseEnvelope(req.id, true, { opened: true });
  assert.equal(resp.version, '1.0.0');
  assert.equal(resp.id, req.id);
  assert.equal(resp.ok, true);
  assert.deepEqual(resp.result, { opened: true });
});

test('typed protocol errors format correctly', () => {
  const err = createError(ErrorCodes.ERR_IS_DIRECTORY, 'Target is a directory', { path: '/tmp' });
  assert.equal(err.code, 'ERR_IS_DIRECTORY');
  assert.equal(err.message, 'Target is a directory');
  assert.deepEqual(err.details, { path: '/tmp' });

  const resp = createResponseEnvelope('req_1', false, null, err);
  assert.equal(resp.ok, false);
  assert.equal(resp.error.code, 'ERR_IS_DIRECTORY');
});

test('validatePathForOpen distinguishes existing files, missing files, empty inputs, and directories', () => {
  const sampleFile = join(testDir, 'sample.md');
  writeFileSync(sampleFile, '# Test');

  const fileResult = validatePathForOpen(sampleFile);
  assert.equal(fileResult.ok, true);
  assert.equal(fileResult.isDir, false);
  assert.equal(fileResult.path, resolve(sampleFile));

  const dirResult = validatePathForOpen(testDir);
  assert.equal(dirResult.ok, true);
  assert.equal(dirResult.isDir, true);

  const missingResult = validatePathForOpen(join(testDir, 'nonexistent.md'));
  assert.equal(missingResult.ok, false);
  assert.equal(missingResult.error.code, ErrorCodes.ERR_NOT_FOUND);

  const emptyResult = validatePathForOpen('');
  assert.equal(emptyResult.ok, false);
  assert.equal(emptyResult.error.code, ErrorCodes.ERR_INVALID_COMMAND);
});

test('resolveNewDestination produces absolute path and handles extensions and directory collisions', () => {
  const relPath = 'my-new-file';
  const resolved = resolveNewDestination(relPath, testDir);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.path, resolve(testDir, 'my-new-file.md'));

  const existingDir = join(testDir, 'folder.md');
  mkdirSync(existingDir, { recursive: true });

  const collision = resolveNewDestination(existingDir, testDir);
  assert.equal(collision.ok, false);
  assert.equal(collision.error.code, ErrorCodes.ERR_IS_DIRECTORY);

  const missingParent = resolveNewDestination(join(testDir, 'nonexistent_folder', 'file.md'), testDir);
  assert.equal(missingParent.ok, false);
  assert.equal(missingParent.error.code, ErrorCodes.ERR_NOT_DIRECTORY);
});

test('findEditorExecutable honors MDEDIT_DEV_APP and platform candidates', () => {
  const env = { MDEDIT_DEV_APP: 'C:\\custom\\app.exe' };
  const foundDev = findEditorExecutable({ platform: 'win32', env, projectRoot: testDir });
  assert.equal(foundDev.isDevOverride, true);
  assert.equal(foundDev.path, 'C:\\custom\\app.exe');

  const foundNoDev = findEditorExecutable({ platform: 'win32', env: {}, projectRoot: testDir });
  assert.equal(foundNoDev.isDevOverride, false);
});

test('launchEditor fails gracefully when no editor is found', () => {
  const res = launchEditor({ platform: 'win32', projectRoot: testDir, env: {} });
  assert.equal(res.ok, false);
  assert.equal(res.error.code, ErrorCodes.ERR_APP_UNAVAILABLE);
  assert.ok(res.error.message.includes('MDEDIT_DEV_APP'));
});

test('launchEditor enforces shell:false for normal executables and rejects batch scripts', () => {
  let spawned = null;
  const mockSpawn = (cmd, args, opts) => {
    spawned = { cmd, args, opts };
    return { unref: () => {} };
  };

  const winExeRes = launchEditor({
    platform: 'win32',
    env: { MDEDIT_DEV_APP: 'C:\\Program Files\\App\\app.exe' },
    filePath: 'C:\\docs\\test.md',
    spawnFn: mockSpawn,
  });
  assert.equal(winExeRes.ok, true);
  assert.equal(spawned.cmd, 'C:\\Program Files\\App\\app.exe');
  assert.deepEqual(spawned.args, ['C:\\docs\\test.md']);
  assert.equal(spawned.opts.shell, false);

  const batRes = launchEditor({
    platform: 'win32',
    env: { MDEDIT_DEV_APP: 'C:\\tools\\run.bat' },
    filePath: 'C:\\docs\\test.md',
    spawnFn: mockSpawn,
  });
  assert.equal(batRes.ok, false);
  assert.equal(batRes.error.code, ErrorCodes.ERR_UNSUPPORTED);
  assert.ok(batRes.error.message.includes('Batch script overrides'));

  const cmdRes = launchEditor({
    platform: 'win32',
    env: { MDEDIT_DEV_APP: 'C:\\tools\\run.cmd' },
    filePath: 'C:\\docs\\test.md',
    spawnFn: mockSpawn,
  });
  assert.equal(cmdRes.ok, false);
  assert.equal(cmdRes.error.code, ErrorCodes.ERR_UNSUPPORTED);
});

test('exportPdf reports artifactCreated truthfully based on file existence', async () => {
  const sampleFile = join(testDir, 'pdf-sample.md');
  writeFileSync(sampleFile, '# PDF Test');
  const outFile = join(testDir, 'pdf-sample.pdf');

  const mockClient = new EditorClient({
    port: 51234,
    mockSend: async (req) => createResponseEnvelope(req.id, true, { triggered: true }),
  });
  const result = await mockClient.exportPdf(sampleFile, outFile);

  assert.equal(result.ok, true);
  assert.equal(result.artifactCreated, false);
  assert.ok(result.message.includes('manual') || result.message.includes('dialog'));

  // Now write dummy PDF artifact and re-test
  writeFileSync(outFile, '%PDF-1.4 dummy content');
  const resultWithFile = await mockClient.exportPdf(sampleFile, outFile);
  assert.equal(resultWithFile.ok, true);
  assert.equal(resultWithFile.artifactCreated, true);
  assert.equal(resultWithFile.message, `PDF created at ${outFile}`);
});

test('EditorClient matches request IDs and returns structured errors on mismatch', async () => {
  const mockClient = new EditorClient({
    mockSend: async (req) => ({ version: CONTRACT_VERSION, id: 'wrong-id', ok: true, result: {} }),
  });
  const res = await mockClient.send('status');
  assert.equal(res.ok, false);
  assert.equal(res.error.code, ErrorCodes.ERR_INVALID_RESPONSE);
  assert.equal(res.error.message, 'Response request ID mismatch');
});

test('EditorClient handles pre-v1 legacy Rust responses gracefully', async () => {
  const mockClient = new EditorClient({
    mockSend: async () => ({ ok: true, cmd: 'status' }),
  });
  const res = await mockClient.send('status');
  assert.equal(res.ok, true);
  assert.equal(res.version, CONTRACT_VERSION);
  assert.ok(res.id);
});
