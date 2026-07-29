import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  act, fireEvent, render, renderHook, screen, waitFor,
} from '@testing-library/react';
import React from 'react';
import App from '../App.jsx';
import { useSearchAndReplace } from '../hooks/useSearchAndReplace';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd) => {
    if (cmd === 'get_initial_file') return Promise.resolve(null);
    return Promise.resolve();
  }),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  ask: vi.fn().mockResolvedValue(true),
  message: vi.fn().mockResolvedValue(true),
}));

vi.mock('../hooks/useOsEnv', () => ({
  useOsEnv: vi.fn().mockReturnValue({ isMac: false }),
}));

// Mock scrollTo since JSDOM doesn't implement it
Element.prototype.scrollTo = vi.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: {
    open: vi.fn().mockReturnValue({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    }),
  },
});


describe('Search and Replace Logic & State Management', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tests finding, replacing, regex, and case sensitivity', async () => {
    render(<App />);

    // Wait for the editor to render
    const editor = await waitFor(() => document.querySelector('.w-md-editor-text-input'));
    expect(editor).not.toBeNull();
    
    // Set some initial markdown
    fireEvent.change(editor, { target: { value: 'Hello World\nhello world\nHELLO WORLD' } });

    // Open Find & Replace Modal (simulate Ctrl+F)
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF', ctrlKey: true });
    
    const findInput = await screen.findByLabelText('Find:');
    const replaceInput = screen.getByLabelText('Replace:');
    
    // 1. Searching text and finding match counts.
    fireEvent.change(findInput, { target: { value: 'hello' } });
    
    // By default, case-insensitive (gi)
    await screen.findByText('3 matches found');
    
    // 5. Case sensitivity and regex match options.
    const matchCaseCheck = screen.getByLabelText('Match Case');
    fireEvent.click(matchCaseCheck);
    
    await screen.findByText('1 match found'); // "hello" only matches the second line now
    
    // Turn off match case
    fireEvent.click(matchCaseCheck);
    
    // 2. Navigating next match / previous match.
    const findNextBtn = screen.getByRole('button', { name: 'Find Next' });
    const findPrevBtn = screen.getByRole('button', { name: 'Find Prev' });
    
    fireEvent.click(findNextBtn);
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe(5);

    fireEvent.click(findNextBtn);
    expect(editor.selectionStart).toBe(12);
    expect(editor.selectionEnd).toBe(17);

    fireEvent.click(findPrevBtn);
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe(5);
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
    
    // Regex test
    const useRegexCheck = screen.getByLabelText('Use Regex');
    fireEvent.click(useRegexCheck);
    
    // "h.llo" regex case insensitive
    fireEvent.change(findInput, { target: { value: 'h.llo' } });
    await screen.findByText('3 matches found');
    
    // 3. Replacing single match instance.
    fireEvent.change(replaceInput, { target: { value: 'hi' } });
    
    const replaceBtn = screen.getByRole('button', { name: 'Replace' });
    
    // Select the exact text first for single replace
    editor.selectionStart = 0;
    editor.selectionEnd = 11; // "Hello World"
    
    fireEvent.change(findInput, { target: { value: 'Hello World' } });
    if (useRegexCheck.checked) fireEvent.click(useRegexCheck); // turn off regex
    
    fireEvent.click(replaceBtn);
    
    // Check if replaced. "Hello World" becomes "hi"
    await waitFor(() => {
        expect(editor.value).toContain('hi\nhello world\nHELLO WORLD');
    });

    // 4. Replacing all match instances.
    fireEvent.change(findInput, { target: { value: 'world' } });
    fireEvent.change(replaceInput, { target: { value: 'earth' } });
    
    const replaceAllBtn = screen.getByRole('button', { name: 'Replace All' });
    fireEvent.click(replaceAllBtn);
    
    await waitFor(() => {
        expect(editor.value).toBe('hi\nhello earth\nHELLO earth');
    });
  });

  it('finds, selects, and scrolls rendered text in preview-only mode', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => {
      expect(document.querySelector('.w-md-editor-text-input')).toBeNull();
      expect(document.querySelector('.w-md-editor-show-preview')?.textContent)
        .toContain('Hello, world!');
    });

    fireEvent.keyDown(window, {
      key: 'f',
      code: 'KeyF',
      ctrlKey: true,
    });

    const findInput = await screen.findByLabelText('Find:');
    fireEvent.change(findInput, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find Next' }));

    expect(window.getSelection().toString()).toBe('Hello');
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
  });

  it('highlights every match in both the source and split preview', () => {
    const highlightRegistry = {
      delete: vi.fn(),
      set: vi.fn(),
    };
    class TestHighlight {
      constructor(...ranges) {
        this.ranges = ranges;
      }
    }
    vi.stubGlobal('CSS', {
      ...(globalThis.CSS || {}),
      highlights: highlightRegistry,
    });
    vi.stubGlobal('Highlight', TestHighlight);

    const fixture = document.createElement('div');
    fixture.innerHTML = `
      <div class="w-md-editor-text-pre">Hello source</div>
      <div class="w-md-editor-preview">
        <div class="wmde-markdown">Hello preview</div>
      </div>
    `;
    document.body.prepend(fixture);
    const { result, unmount } = renderHook(() => (
      useSearchAndReplace('Hello source', vi.fn())
    ));

    act(() => {
      result.current.handleHighlightFind('Hello');
    });

    const resultsCall = highlightRegistry.set.mock.calls
      .findLast(([name]) => name === 'md-find-results');
    expect(resultsCall).toBeDefined();
    expect(resultsCall[1].ranges.length).toBe(2);

    unmount();
    fixture.remove();
  });

  it('replaces the active match and supports regex capture substitutions', () => {
    const editor = document.createElement('textarea');
    editor.className = 'w-md-editor-text-input';
    editor.value = 'one one';
    document.body.prepend(editor);
    const setMarkdown = vi.fn();
    const { result, unmount } = renderHook(() => (
      useSearchAndReplace('one one', setMarkdown)
    ));

    act(() => {
      result.current.handleFind('one');
      result.current.handleFind('one');
      result.current.handleReplace('one', 'two');
    });
    expect(setMarkdown).toHaveBeenCalledWith('one two');

    unmount();
    editor.remove();

    const setRegexMarkdown = vi.fn();
    const regexHook = renderHook(() => (
      useSearchAndReplace('alpha-1 beta-2', setRegexMarkdown)
    ));
    act(() => {
      regexHook.result.current.handleReplaceAll(
        '([a-z]+)-(\\d)',
        '$2:$1',
        false,
        true,
      );
    });
    expect(setRegexMarkdown).toHaveBeenCalledWith('1:alpha 2:beta');
    regexHook.unmount();
  });

  it('advances through zero-width regex matches', () => {
    const editor = document.createElement('textarea');
    editor.className = 'w-md-editor-text-input';
    editor.value = 'aa';
    document.body.prepend(editor);
    const { result, unmount } = renderHook(() => (
      useSearchAndReplace('aa', vi.fn())
    ));

    act(() => result.current.handleFind('(?=a)', false, true));
    expect(editor.selectionStart).toBe(0);
    act(() => result.current.handleFind('(?=a)', false, true));
    expect(editor.selectionStart).toBe(1);

    unmount();
    editor.remove();
  });
});
