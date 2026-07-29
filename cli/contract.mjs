import { createConnection } from 'node:net';
import { existsSync, statSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const CONTRACT_VERSION = '1.0.0';
export const DEFAULT_CONTROL_PORT = 51234;

export const ErrorCodes = Object.freeze({
  ERR_APP_UNAVAILABLE: 'ERR_APP_UNAVAILABLE',
  ERR_TIMEOUT: 'ERR_TIMEOUT',
  ERR_PROTOCOL_MISMATCH: 'ERR_PROTOCOL_MISMATCH',
  ERR_INVALID_RESPONSE: 'ERR_INVALID_RESPONSE',
  ERR_INVALID_COMMAND: 'ERR_INVALID_COMMAND',
  ERR_NOT_FOUND: 'ERR_NOT_FOUND',
  ERR_IS_DIRECTORY: 'ERR_IS_DIRECTORY',
  ERR_NOT_DIRECTORY: 'ERR_NOT_DIRECTORY',
  ERR_UNSUPPORTED: 'ERR_UNSUPPORTED',
  ERR_REJECTED: 'ERR_REJECTED',
});

export function createError(code, message, details = undefined) {
  return details === undefined ? { code, message } : { code, message, details };
}

export function createRequestEnvelope(command, args = {}, id = randomUUID()) {
  return { version: CONTRACT_VERSION, id, cmd: command, args };
}

export function createResponseEnvelope(id, ok, result = null, error = null) {
  const envelope = { version: CONTRACT_VERSION, id, ok: Boolean(ok) };
  if (envelope.ok) envelope.result = result ?? {};
  else envelope.error = error ?? createError(ErrorCodes.ERR_REJECTED, 'Command rejected');
  return envelope;
}

export function validatePathForOpen(inputPath, cwd = process.cwd()) {
  if (!inputPath || typeof inputPath !== 'string' || !inputPath.trim()) {
    return { ok: false, error: createError(ErrorCodes.ERR_INVALID_COMMAND, 'Path argument is required') };
  }
  const absolutePath = resolve(cwd, inputPath.trim());
  if (!existsSync(absolutePath)) {
    return { ok: false, error: createError(ErrorCodes.ERR_NOT_FOUND, 'Path does not exist', { path: absolutePath }) };
  }

  try {
    const isDir = statSync(absolutePath).isDirectory();
    return { ok: true, path: absolutePath, isDir };
  } catch (err) {
    return { ok: false, error: createError(ErrorCodes.ERR_REJECTED, err.message || 'Cannot access path', { path: absolutePath }) };
  }
}

export function resolveNewDestination(inputPath, cwd = process.cwd()) {
  if (!inputPath || typeof inputPath !== 'string' || !inputPath.trim()) {
    return { ok: false, error: createError(ErrorCodes.ERR_INVALID_COMMAND, 'A destination name is required') };
  }

  const requested = inputPath.trim();
  let destination = isAbsolute(requested) ? requested : resolve(cwd, requested);
  if (!extname(destination)) destination += '.md';

  try {
    if (existsSync(destination) && statSync(destination).isDirectory()) {
      return { ok: false, error: createError(ErrorCodes.ERR_IS_DIRECTORY, 'Destination is a directory', { path: destination }) };
    }

    const parent = dirname(destination);
    if (!existsSync(parent) || !statSync(parent).isDirectory()) {
      return { ok: false, error: createError(ErrorCodes.ERR_NOT_DIRECTORY, 'Destination directory does not exist', { path: parent }) };
    }
  } catch (err) {
    return { ok: false, error: createError(ErrorCodes.ERR_REJECTED, err.message || 'Path check failed', { path: destination }) };
  }

  return { ok: true, path: resolve(destination), name: basename(destination) };
}

function windowsCandidates(projectRoot) {
  const candidates = [];
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  if (localAppData) {
    candidates.push(
      join(localAppData, 'Programs', 'Beledarians Markdown Editor', 'Beledarians Markdown Editor.exe'),
      join(localAppData, 'Beledarians Markdown Editor', 'Beledarians Markdown Editor.exe'),
    );
  }
  candidates.push(
    join(programFiles, 'Beledarians Markdown Editor', 'Beledarians Markdown Editor.exe'),
    join(programFilesX86, 'Beledarians Markdown Editor', 'Beledarians Markdown Editor.exe'),
    join(projectRoot, 'src-tauri', 'target', 'release', 'beledarians-markdown-editor.exe'),
    join(projectRoot, 'src-tauri', 'target', 'debug', 'beledarians-markdown-editor.exe'),
    join(projectRoot, 'src-tauri', 'target', 'release', 'app.exe'),
    join(projectRoot, 'src-tauri', 'target', 'debug', 'app.exe'),
  );
  return candidates;
}

function macCandidates(projectRoot) {
  const home = process.env.HOME;
  return [
    home ? join(home, 'Applications', 'Beledarians Markdown Editor.app') : null,
    '/Applications/Beledarians Markdown Editor.app',
    join(projectRoot, 'src-tauri', 'target', 'release', 'bundle', 'macos', 'Beledarians Markdown Editor.app'),
  ].filter(Boolean);
}

function linuxCandidates(projectRoot) {
  const home = process.env.HOME;
  return [
    '/usr/bin/beledarians-markdown-editor',
    '/usr/local/bin/beledarians-markdown-editor',
    home ? join(home, '.local', 'bin', 'beledarians-markdown-editor') : null,
    join(projectRoot, 'src-tauri', 'target', 'release', 'beledarians-markdown-editor'),
    join(projectRoot, 'src-tauri', 'target', 'debug', 'beledarians-markdown-editor'),
  ].filter(Boolean);
}

export function findEditorExecutable({
  platform = process.platform,
  projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  env = process.env,
} = {}) {
  if (env.MDEDIT_DEV_APP && typeof env.MDEDIT_DEV_APP === 'string') {
    const devPath = env.MDEDIT_DEV_APP.trim().replace(/^"|"$/g, '');
    if (devPath) {
      return { path: devPath, platform, isDevOverride: true };
    }
  }

  let candidates;
  if (platform === 'darwin') {
    candidates = macCandidates(projectRoot);
  } else if (platform === 'win32') {
    candidates = windowsCandidates(projectRoot);
  } else {
    candidates = linuxCandidates(projectRoot);
  }

  const path = candidates.find(c => existsSync(c)) ?? null;
  return { path, platform, isDevOverride: false };
}

export function launchEditor({ filePath = null, platform = process.platform, projectRoot, env = process.env, spawnFn = spawn } = {}) {
  const found = findEditorExecutable({ platform, projectRoot, env });
  if (!found.path) {
    return {
      ok: false,
      error: createError(
        ErrorCodes.ERR_APP_UNAVAILABLE,
        'Installed editor executable was not found. Set MDEDIT_DEV_APP environment variable to specify an explicit executable path for development.'
      ),
    };
  }

  if (/\.(bat|cmd)$/i.test(found.path)) {
    return {
      ok: false,
      error: createError(
        ErrorCodes.ERR_UNSUPPORTED,
        'Batch script overrides (.bat/.cmd) are not supported',
        { path: found.path }
      ),
    };
  }

  let command = found.path;
  let args = filePath ? [filePath] : [];
  if (platform === 'darwin' && found.path.endsWith('.app')) {
    command = 'open';
    args = ['-a', found.path, ...(filePath ? ['--args', filePath] : [])];
  }

  try {
    const child = spawnFn(command, args, {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });
    if (child && typeof child.unref === 'function') {
      child.unref();
    }
    return { ok: true, path: found.path, isDevOverride: found.isDevOverride };
  } catch (err) {
    return {
      ok: false,
      error: createError(ErrorCodes.ERR_APP_UNAVAILABLE, err.message || 'Failed to spawn editor process', { cause: err.message }),
    };
  }
}

export function parseHttpResponse(data) {
  let body = data;
  const doubleCRLF = data.indexOf('\r\n\r\n');
  if (doubleCRLF >= 0) {
    body = data.slice(doubleCRLF + 4);
  } else {
    const doubleLF = data.indexOf('\n\n');
    if (doubleLF >= 0) {
      body = data.slice(doubleLF + 2);
    }
  }
  try {
    return JSON.parse(body.trim());
  } catch {
    throw Object.assign(new Error('The editor returned an invalid response'), {
      contractError: createError(ErrorCodes.ERR_INVALID_RESPONSE, 'Invalid JSON response', { raw: data.slice(0, 500) }),
    });
  }
}

export function sendEnvelope(envelope, { port = DEFAULT_CONTROL_PORT, host = '127.0.0.1', timeoutMs = 5000 } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const body = JSON.stringify(envelope);
    const request = [
      'POST /cmd HTTP/1.1',
      `Host: ${host}:${port}`,
      'Content-Type: application/json',
      `Content-Length: ${Buffer.byteLength(body)}`,
      'Connection: close',
      '',
      body,
    ].join('\r\n');

    const connection = createConnection({ port, host }, () => connection.write(request));
    let data = '';
    connection.on('data', chunk => { data += chunk; });
    connection.on('end', () => {
      try {
        const response = parseHttpResponse(data);
        if (response.version && response.version !== CONTRACT_VERSION) {
          rejectPromise(Object.assign(new Error('Protocol version mismatch'), {
            contractError: createError(ErrorCodes.ERR_PROTOCOL_MISMATCH, 'Protocol version mismatch', { expected: CONTRACT_VERSION, received: response.version }),
          }));
          return;
        }
        resolvePromise(response);
      } catch (error) {
        rejectPromise(error);
      }
    });
    connection.on('error', error => {
      rejectPromise(Object.assign(error, {
        contractError: createError(ErrorCodes.ERR_APP_UNAVAILABLE, 'Editor control bridge is unavailable', { cause: error.message }),
      }));
    });
    connection.setTimeout(timeoutMs, () => {
      connection.destroy();
      rejectPromise(Object.assign(new Error('Editor command timed out'), {
        contractError: createError(ErrorCodes.ERR_TIMEOUT, 'Editor command timed out', { timeoutMs }),
      }));
    });
  });
}

export async function pingEditor(options = {}) {
  try {
    const client = new EditorClient(options);
    const response = await client.status();
    return response.ok === true;
  } catch {
    return false;
  }
}

export class EditorClient {
  constructor({ port = DEFAULT_CONTROL_PORT, host = '127.0.0.1', timeoutMs = 5000, mockSend = null } = {}) {
    this.options = { port, host, timeoutMs };
    this.mockSend = mockSend;
  }

  async send(command, args = {}) {
    const request = createRequestEnvelope(command, args);
    let response;
    try {
      response = this.mockSend ? await this.mockSend(request) : await sendEnvelope(request, this.options);
    } catch (err) {
      if (err && err.contractError) {
        return createResponseEnvelope(request.id, false, null, err.contractError);
      }
      return createResponseEnvelope(request.id, false, null, createError(ErrorCodes.ERR_APP_UNAVAILABLE, err.message || 'Network error'));
    }

    if (response && response.version === undefined) {
      return response.ok
        ? createResponseEnvelope(request.id, true, response.result ?? response)
        : createResponseEnvelope(request.id, false, null, typeof response.error === 'object'
          ? response.error
          : createError(ErrorCodes.ERR_REJECTED, response.error || 'Command rejected'));
    }

    if (response.id !== request.id) {
      return createResponseEnvelope(request.id, false, null, createError(ErrorCodes.ERR_INVALID_RESPONSE, 'Response request ID mismatch', { expected: request.id, received: response.id }));
    }
    return response;
  }

  async open(path) {
    const validation = validatePathForOpen(path);
    if (!validation.ok) return createResponseEnvelope(randomUUID(), false, null, validation.error);
    if (validation.isDir) {
      return createResponseEnvelope(randomUUID(), false, null, createError(ErrorCodes.ERR_IS_DIRECTORY, 'Directory opening is not supported by the current editor bridge', { path: validation.path }));
    }
    return this.send('open', { path: validation.path, paths: [validation.path] });
  }

  async create(path, cwd = process.cwd()) {
    const destination = resolveNewDestination(path, cwd);
    if (!destination.ok) return createResponseEnvelope(randomUUID(), false, null, destination.error);
    return this.send('new', { path: destination.path, name: destination.name });
  }

  async exportPdf(sourcePath, outputPath) {
    const validation = validatePathForOpen(sourcePath);
    if (!validation.ok) return { ok: false, artifactCreated: false, error: validation.error };
    if (validation.isDir) {
      return { ok: false, artifactCreated: false, error: createError(ErrorCodes.ERR_IS_DIRECTORY, 'PDF source must be a file', { path: validation.path }) };
    }

    const output = resolve(outputPath || validation.path.replace(/\.(md|markdown)$/i, '.pdf'));
    const response = await this.send('pdf', { path: validation.path, output });
    const artifactCreated = existsSync(output);
    return {
      ok: response.ok,
      artifactCreated,
      output,
      message: artifactCreated
        ? `PDF created at ${output}`
        : 'The editor opened its manual print dialog; no PDF artifact was created automatically.',
      ...(response.ok ? {} : { error: response.error }),
    };
  }

  async status() {
    return this.send('status', {});
  }

  async ensureRunning(options = {}) {
    const isRunning = await pingEditor(this.options);
    if (isRunning) {
      return { ok: true, running: true, launched: false };
    }

    const launchResult = launchEditor({ ...options, env: options.env || process.env });
    if (!launchResult.ok) {
      return launchResult;
    }

    const timeoutMs = options.timeoutMs || 8000;
    const pollInterval = 200;
    const maxRetries = Math.ceil(timeoutMs / pollInterval);

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, pollInterval));
      if (await pingEditor(this.options)) {
        return { ok: true, running: true, launched: true };
      }
    }

    return {
      ok: false,
      error: createError(ErrorCodes.ERR_TIMEOUT, 'Editor process was launched but the control bridge server did not start in time', { timeoutMs }),
    };
  }
}
