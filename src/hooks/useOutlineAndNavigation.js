import { useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const getEditorScrollContainer = (editor) => (
  editor?.closest('.w-md-editor-area')
  || editor?.closest('.w-md-editor-text')
  || editor
);

export function useOutlineAndNavigation({ markdown, debouncedMarkdown }) {
  const headings = useMemo(() => {
    if (!debouncedMarkdown) return [];
    const lines = debouncedMarkdown.split('\n');
    const result = [];
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        result.push({
          level: match[1].length,
          text: match[2],
          line: index
        });
      }
    });
    return result;
  }, [debouncedMarkdown]);

  const scrollToLine = useCallback((line) => {
    const editor = typeof document !== 'undefined' ? document.querySelector('.w-md-editor-text-input') : null;
    if (editor) {
      const scrollEl = getEditorScrollContainer(editor);
      const computed = getComputedStyle(editor).lineHeight;
      const lineHeight = computed === 'normal'
        ? parseFloat(getComputedStyle(editor).fontSize) * 1.2
        : (parseInt(computed) || 24);
      scrollEl.scrollTop = line * lineHeight;
    }

    const previewArea = typeof document !== 'undefined' ? document.querySelector('.w-md-editor-preview') : null;
    if (previewArea) {
      const targetLine = line + 1;
      const elements = previewArea.querySelectorAll('[data-source-line]');
      let targetEl = null;
      for (const el of elements) {
        const elLine = parseInt(el.getAttribute('data-source-line'), 10);
        if (Number.isNaN(elLine)) continue;
        if (elLine === targetLine) { targetEl = el; break; }
        if (elLine > targetLine) break;
        targetEl = el;
      }
      if (targetEl) {
        const elRect = targetEl.getBoundingClientRect();
        const previewRect = previewArea.getBoundingClientRect();
        previewArea.scrollTo({
          top: previewArea.scrollTop + (elRect.top - previewRect.top),
          behavior: 'smooth',
        });
      }
    } else if (editor) {
      editor.focus();
    }
  }, []);

  const handleNavigate = useCallback(({ line, search }) => {
    const editor = typeof document !== 'undefined' ? document.querySelector('.w-md-editor-text-input') : null;
    if (!editor) return;
    const scrollEl = getEditorScrollContainer(editor);

    if (line) {
      const lines = markdown.split('\n');
      let targetIndex = 0;
      for (let i = 0; i < line - 1 && i < lines.length; i++) {
        targetIndex += lines[i].length + 1;
      }
      editor.setSelectionRange(targetIndex, targetIndex + (lines[line - 1]?.length || 0));
      editor.focus();

      const lineHeight = parseInt(getComputedStyle(editor).lineHeight) || 24;
      const targetScroll = (line - 1) * lineHeight - (scrollEl.clientHeight / 3);
      scrollEl.scrollTo({ top: targetScroll, behavior: 'smooth' });
    } else if (search) {
      const idx = markdown.indexOf(search);
      if (idx !== -1) {
        editor.setSelectionRange(idx, idx + search.length);
        editor.focus();

        const textUpToMatch = markdown.substring(0, idx);
        const lineNum = textUpToMatch.split('\n').length;
        const lineHeight = parseInt(getComputedStyle(editor).lineHeight) || 24;
        const targetScroll = (lineNum - 1) * lineHeight - (scrollEl.clientHeight / 3);
        scrollEl.scrollTo({ top: targetScroll, behavior: 'smooth' });
      } else {
        toast.error(`Could not find "${search}" in document`);
      }
    }
  }, [markdown]);

  return {
    headings,
    scrollToLine,
    handleNavigate
  };
}
