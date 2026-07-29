import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App.jsx';

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

  it('tests finding, replacing, regex, and case sensitivity', async () => {
    render(<App />);

    // Wait for the editor to render
    const editor = await waitFor(() => document.querySelector('.w-md-editor-text-input'));
    expect(editor).not.toBeNull();
    
    // Set some initial markdown
    fireEvent.change(editor, { target: { value: 'Hello World\nhello world\nHELLO WORLD' } });

    // Open Find & Replace Modal (simulate Ctrl+H)
    fireEvent.keyDown(window, { key: 'h', code: 'KeyH', ctrlKey: true });
    
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
});
