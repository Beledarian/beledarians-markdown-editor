import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOutlineAndNavigation } from './useOutlineAndNavigation';

describe('useOutlineAndNavigation', () => {
  it('extracts headings from debounced markdown correctly', () => {
    const markdown = '# Title\nSome text\n## Section 1\n### Subsection\n- Item';
    const { result } = renderHook(() => useOutlineAndNavigation({
      markdown,
      debouncedMarkdown: markdown
    }));

    expect(result.current.headings).toEqual([
      { level: 1, text: 'Title', line: 0 },
      { level: 2, text: 'Section 1', line: 2 },
      { level: 3, text: 'Subsection', line: 3 }
    ]);
  });

  it('returns empty array when debouncedMarkdown is empty', () => {
    const { result } = renderHook(() => useOutlineAndNavigation({
      markdown: '',
      debouncedMarkdown: ''
    }));

    expect(result.current.headings).toEqual([]);
  });

  it('provides scrollToLine and handleNavigate functions', () => {
    const { result } = renderHook(() => useOutlineAndNavigation({
      markdown: '# Hello',
      debouncedMarkdown: '# Hello'
    }));

    expect(typeof result.current.scrollToLine).toBe('function');
    expect(typeof result.current.handleNavigate).toBe('function');
  });
});
