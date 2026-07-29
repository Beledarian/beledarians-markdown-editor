import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabOperations } from './useTabOperations';

describe('useTabOperations', () => {
  it('closes other tabs when handleCloseOtherTabs is called', () => {
    const openFiles = [
      { path: 'doc1', name: 'doc1.md' },
      { path: 'doc2', name: 'doc2.md' },
      { path: 'doc3', name: 'doc3.md' }
    ];
    let currentOpenFiles = [...openFiles];
    const setOpenFiles = vi.fn((updater) => {
      currentOpenFiles = typeof updater === 'function' ? updater(currentOpenFiles) : updater;
    });
    const switchTab = vi.fn();

    const { result } = renderHook(() => useTabOperations({
      openFiles,
      setOpenFiles,
      activeFileId: 'doc1',
      setActiveFileId: vi.fn(),
      switchTab
    }));

    act(() => {
      result.current.handleCloseOtherTabs('doc2');
    });

    expect(setOpenFiles).toHaveBeenCalled();
    expect(currentOpenFiles).toEqual([{ path: 'doc2', name: 'doc2.md' }]);
    expect(switchTab).toHaveBeenCalledWith('doc2');
  });

  it('closes tabs to the right when handleCloseTabsToRight is called', () => {
    const openFiles = [
      { path: 'doc1', name: 'doc1.md' },
      { path: 'doc2', name: 'doc2.md' },
      { path: 'doc3', name: 'doc3.md' }
    ];
    let currentOpenFiles = [...openFiles];
    const setOpenFiles = vi.fn((updater) => {
      currentOpenFiles = typeof updater === 'function' ? updater(currentOpenFiles) : updater;
    });

    const { result } = renderHook(() => useTabOperations({
      openFiles,
      setOpenFiles,
      activeFileId: 'doc1',
      setActiveFileId: vi.fn(),
      switchTab: vi.fn()
    }));

    act(() => {
      result.current.handleCloseTabsToRight('doc1');
    });

    expect(currentOpenFiles).toEqual([{ path: 'doc1', name: 'doc1.md' }]);
  });

  it('duplicates a tab when handleDuplicateTab is called', () => {
    const openFiles = [{ path: 'doc1', name: 'doc1.md', content: 'test' }];
    let currentOpenFiles = [...openFiles];
    const setOpenFiles = vi.fn((updater) => {
      currentOpenFiles = typeof updater === 'function' ? updater(currentOpenFiles) : updater;
    });
    const switchTab = vi.fn();

    const { result } = renderHook(() => useTabOperations({
      openFiles,
      setOpenFiles,
      activeFileId: 'doc1',
      setActiveFileId: vi.fn(),
      switchTab
    }));

    act(() => {
      result.current.handleDuplicateTab('doc1');
    });

    expect(currentOpenFiles.length).toBe(2);
    expect(currentOpenFiles[1].name).toBe('doc1.md (Copy)');
    expect(switchTab).toHaveBeenCalled();
  });

  it('reorders tabs correctly', () => {
    const openFiles = [
      { path: 'doc1' },
      { path: 'doc2' },
      { path: 'doc3' }
    ];
    let currentOpenFiles = [...openFiles];
    const setOpenFiles = vi.fn((updater) => {
      currentOpenFiles = typeof updater === 'function' ? updater(currentOpenFiles) : updater;
    });

    const { result } = renderHook(() => useTabOperations({
      openFiles,
      setOpenFiles,
      activeFileId: 'doc1',
      setActiveFileId: vi.fn(),
      switchTab: vi.fn()
    }));

    act(() => {
      result.current.handleTabReorder(0, 2);
    });

    expect(currentOpenFiles.map(f => f.path)).toEqual(['doc2', 'doc3', 'doc1']);
  });
});
