import { describe, it, expect } from 'vitest';
import { insertFormattingSyntax } from './formatting';

describe('insertFormattingSyntax', () => {
  it('wraps selected text with bold syntax', () => {
    const text = 'Hello world';
    const selection = { start: 0, end: 5 };
    const result = insertFormattingSyntax(text, selection, 'bold');
    expect(result).toBe('**Hello** world');
  });

  it('inserts default bold fallback when selection is empty', () => {
    const text = '';
    const selection = { start: 0, end: 0 };
    const result = insertFormattingSyntax(text, selection, 'bold');
    expect(result).toBe('**bold text**');
  });

  it('wraps selected text with italic syntax', () => {
    const text = 'Hello world';
    const selection = { start: 6, end: 11 };
    const result = insertFormattingSyntax(text, selection, 'italic');
    expect(result).toBe('Hello *world*');
  });

  it('inserts inline code syntax', () => {
    const text = 'const x = 10;';
    const selection = { start: 0, end: 12 };
    const result = insertFormattingSyntax(text, selection, 'code');
    expect(result).toBe('`const x = 10`;');
  });

  it('inserts a table structure', () => {
    const text = '';
    const selection = { start: 0, end: 0 };
    const result = insertFormattingSyntax(text, selection, 'table');
    expect(result).toContain('| Header 1 | Header 2 |');
  });

  it('inserts a task list item', () => {
    const text = '';
    const selection = { start: 0, end: 0 };
    const result = insertFormattingSyntax(text, selection, 'tasklist');
    expect(result).toContain('- [ ] ');
  });
});
