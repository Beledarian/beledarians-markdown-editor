import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileSystem } from './useFileSystem';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

vi.mock('../utils/storage', () => ({
  getDirectoryHandle: vi.fn().mockResolvedValue(null),
  saveDirectoryHandle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/fileSystem', () => ({
  scanDirectory: vi.fn().mockResolvedValue({ mdFiles: [], assetFiles: [] }),
  loadIgnoreFile: vi.fn().mockResolvedValue([]),
  saveIgnoreFile: vi.fn().mockResolvedValue(undefined),
  createNewFile: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
}));

describe('useFileSystem saveFile', () => {
  beforeEach(() => {
    delete window.__TAURI_INTERNALS__;
    invokeMock.mockReset();
  });

  it('prefers a writable browser handle even when a display path is present', async () => {
    const writable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
    };
    const fileHandle = {
      name: 'notes.md',
      getFile: vi.fn()
        .mockResolvedValueOnce({ lastModified: 10 })
        .mockResolvedValueOnce({ lastModified: 20 }),
      createWritable: vi.fn().mockResolvedValue(writable),
    };
    const { result } = renderHook(() => useFileSystem());

    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveFile(
        fileHandle,
        '# Updated',
        10,
        'display-only/notes.md',
      );
    });

    expect(saveResult).toEqual({ success: true, newLastModified: 20 });
    expect(writable.write).toHaveBeenCalledWith('# Updated');
    expect(writable.close).toHaveBeenCalledOnce();
  });

  it('rejects browser path strings instead of accidentally invoking Tauri', async () => {
    const { result } = renderHook(() => useFileSystem());

    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveFile(
        null,
        '# Draft',
        null,
        'draft',
      );
    });

    expect(saveResult).toEqual(expect.objectContaining({
      success: false,
      reason: 'unsupported',
    }));
  });

  it('writes native Markdown paths through the Tauri command', async () => {
    window.__TAURI_INTERNALS__ = {};
    invokeMock
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(20);
    const { result } = renderHook(() => useFileSystem());

    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveFile(
        null,
        '# Native',
        10,
        'C:\\docs\\notes.md',
      );
    });

    expect(invokeMock).toHaveBeenNthCalledWith(
      2,
      'write_markdown_file',
      { path: 'C:\\docs\\notes.md', content: '# Native' },
    );
    expect(saveResult).toEqual({ success: true, newLastModified: 20 });
  });
});
