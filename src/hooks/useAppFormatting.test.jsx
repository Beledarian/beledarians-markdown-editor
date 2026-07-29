import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppFormatting } from './useAppFormatting';

describe('useAppFormatting', () => {
  it('appends text at cursor when insertTextAtCursor is called without DOM editor', () => {
    let markdown = '# Hello';
    const setMarkdown = vi.fn((updater) => {
      markdown = typeof updater === 'function' ? updater(markdown) : updater;
    });

    const { result } = renderHook(() => useAppFormatting({
      markdown,
      setMarkdown,
      setUnsavedChanges: vi.fn(),
      contextMenu: null,
      setContextMenu: vi.fn()
    }));

    act(() => {
      result.current.insertTextAtCursor(' world');
    });

    expect(markdown).toBe('# Hello world');
  });

  it('inserts syntax using handleFormatSyntax', () => {
    let markdown = 'sample text';
    const setMarkdown = vi.fn((updater) => {
      markdown = typeof updater === 'function' ? updater(markdown) : updater;
    });
    const setUnsavedChanges = vi.fn();

    const { result } = renderHook(() => useAppFormatting({
      markdown,
      setMarkdown,
      setUnsavedChanges,
      contextMenu: null,
      setContextMenu: vi.fn()
    }));

    act(() => {
      result.current.handleFormatSyntax('bold');
    });

    expect(setMarkdown).toHaveBeenCalled();
    expect(setUnsavedChanges).toHaveBeenCalledWith(true);
  });

  it('inserts ISO timestamp when handleInsertTimestamp is called', () => {
    let markdown = '';
    const setMarkdown = vi.fn((updater) => {
      markdown = typeof updater === 'function' ? updater(markdown) : updater;
    });

    const { result } = renderHook(() => useAppFormatting({
      markdown,
      setMarkdown,
      setUnsavedChanges: vi.fn(),
      contextMenu: null,
      setContextMenu: vi.fn()
    }));

    act(() => {
      result.current.handleInsertTimestamp();
    });

    expect(markdown).toMatch(/> \d{4}-\d{2}-\d{2}T/);
  });

  it('inserts template content via handleInsertTemplate', () => {
    let markdown = '';
    const setMarkdown = vi.fn((updater) => {
      markdown = typeof updater === 'function' ? updater(markdown) : updater;
    });

    const { result } = renderHook(() => useAppFormatting({
      markdown,
      setMarkdown,
      setUnsavedChanges: vi.fn(),
      contextMenu: null,
      setContextMenu: vi.fn()
    }));

    act(() => {
      result.current.handleInsertTemplate('# Template Header');
    });

    expect(markdown).toBe('# Template Header');
  });
});
