import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act, screen } from '@testing-library/react';
import { usePreviewInteractions } from './usePreviewInteractions';

describe('usePreviewInteractions', () => {
  it('toggles list task item checkboxes correctly', () => {
    let markdown = '- [ ] Task 1\n- [x] Task 2';
    const setMarkdown = vi.fn((updater) => {
      markdown = typeof updater === 'function' ? updater(markdown) : updater;
    });
    const setUnsavedChanges = vi.fn();

    const { result } = renderHook(() => usePreviewInteractions({
      markdownRef: { current: markdown },
      setMarkdown,
      setUnsavedChanges,
      contextMenu: null,
      setContextMenu: vi.fn(),
      setEditorContextMenu: vi.fn(),
      files: [],
      handleFileSelect: vi.fn(),
      assets: [],
      currentFile: null,
      dirHandle: null,
      imageSize: 100,
      imageAlignment: 'none',
      codeTheme: 'VS Code Dark'
    }));

    const mockTarget = {
      closest: (selector) => {
        if (selector === '[data-source-line]') {
          return { getAttribute: () => '1' };
        }
        return null;
      }
    };

    act(() => {
      result.current.handleCheckboxToggle({ target: mockTarget });
    });

    expect(setMarkdown).toHaveBeenCalled();
    expect(markdown).toBe('- [x] Task 1\n- [x] Task 2');
    expect(setUnsavedChanges).toHaveBeenCalledWith(true);
  });

  it('provides React-Markdown custom components object', () => {
    const { result } = renderHook(() => usePreviewInteractions({
      markdownRef: { current: '' },
      setMarkdown: vi.fn(),
      setUnsavedChanges: vi.fn(),
      contextMenu: null,
      setContextMenu: vi.fn(),
      setEditorContextMenu: vi.fn(),
      files: [],
      handleFileSelect: vi.fn(),
      assets: [],
      currentFile: null,
      dirHandle: null,
      imageSize: 100,
      imageAlignment: 'none',
      codeTheme: 'VS Code Dark'
    }));

    expect(result.current.components).toHaveProperty('blockquote');
    expect(result.current.components).toHaveProperty('img');
    expect(result.current.components).toHaveProperty('input');
    expect(result.current.components).toHaveProperty('code');
  });

  it('falls back to a dark syntax theme for an invalid stored theme key', () => {
    const { result } = renderHook(() => usePreviewInteractions({
      markdownRef: { current: '' },
      setMarkdown: vi.fn(),
      setUnsavedChanges: vi.fn(),
      contextMenu: null,
      setContextMenu: vi.fn(),
      setEditorContextMenu: vi.fn(),
      files: [],
      handleFileSelect: vi.fn(),
      assets: [],
      currentFile: null,
      dirHandle: null,
      imageSize: 100,
      imageAlignment: 'none',
      codeTheme: 'oneDark'
    }));

    const Code = result.current.components.code;
    render(
      <Code className="language-javascript" inline={false}>
        {'const answer = 42;'}
      </Code>,
    );

    const code = screen.getByText('42', { exact: false }).closest('code');
    expect(code?.parentElement).toHaveStyle({ background: 'rgb(30, 30, 30)' });
  });
});
