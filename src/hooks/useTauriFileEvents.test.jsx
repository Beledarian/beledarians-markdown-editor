import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTauriFileEvents } from './useTauriFileEvents';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd) => {
    if (cmd === 'get_initial_file') return Promise.resolve(null);
    if (cmd === 'read_file') return Promise.resolve('# Mock File Content');
    return Promise.resolve();
  }),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  ask: vi.fn().mockResolvedValue(true),
}));

describe('useTauriFileEvents', () => {
  it('opens a file via handleOpenFile', async () => {
    const openFileInTab = vi.fn();
    const { result } = renderHook(() => useTauriFileEvents({
      openFileInTab,
      createFile: vi.fn(),
      currentFile: null,
      files: [],
      saveFile: vi.fn(),
      switchTab: vi.fn(),
      openFilesRef: { current: [] },
      markdownRef: { current: '' },
      activeFileIdRef: { current: 'draft' },
      unsavedChangesRef: { current: false },
      setLastSaved: vi.fn(),
      setUnsavedChanges: vi.fn(),
      setCurrentFile: vi.fn(),
      setOpenFiles: vi.fn(),
      setShowPrintModal: vi.fn()
    }));

    await act(async () => {
      await result.current.handleOpenFile('/test/path/file.md');
    });

    expect(openFileInTab).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'file.md', path: '/test/path/file.md' }),
      '# Mock File Content'
    );
  });

  it('creates a new file via handleCreateNewFile', async () => {
    const openFileInTab = vi.fn();
    const createFile = vi.fn().mockResolvedValue({ name: 'newDoc.md', path: '/path/newDoc.md' });

    const { result } = renderHook(() => useTauriFileEvents({
      openFileInTab,
      createFile,
      currentFile: null,
      files: [],
      saveFile: vi.fn(),
      switchTab: vi.fn(),
      openFilesRef: { current: [] },
      markdownRef: { current: '' },
      activeFileIdRef: { current: 'draft' },
      unsavedChangesRef: { current: false },
      setLastSaved: vi.fn(),
      setUnsavedChanges: vi.fn(),
      setCurrentFile: vi.fn(),
      setOpenFiles: vi.fn(),
      setShowPrintModal: vi.fn()
    }));

    await act(async () => {
      await result.current.handleCreateNewFile('newDoc.md');
    });

    expect(createFile).toHaveBeenCalledWith('newDoc.md');
    expect(openFileInTab).toHaveBeenCalledWith(
      { name: 'newDoc.md', path: '/path/newDoc.md' },
      ''
    );
  });

  it('does not discard browser edits when the user cancels file switching', async () => {
    const openFileInTab = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(() => useTauriFileEvents({
      openFileInTab,
      createFile: vi.fn(),
      currentFile: { name: 'draft.md', path: 'draft', storageKind: 'draft' },
      files: [],
      saveFile: vi.fn(),
      switchTab: vi.fn(),
      openFilesRef: { current: [] },
      markdownRef: { current: '# Unsaved' },
      activeFileIdRef: { current: 'draft' },
      unsavedChangesRef: { current: true },
      setLastSaved: vi.fn(),
      setUnsavedChanges: vi.fn(),
      setCurrentFile: vi.fn(),
      setOpenFiles: vi.fn(),
      setShowPrintModal: vi.fn()
    }));

    await act(async () => {
      await result.current.handleFileSelect({
        name: 'next.md',
        path: 'web-file:next.md:1',
        handle: {
          getFile: vi.fn().mockResolvedValue({
            text: vi.fn().mockResolvedValue('# Next'),
            lastModified: 1,
          }),
        },
      });
    });

    expect(confirm).toHaveBeenCalledOnce();
    expect(openFileInTab).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
