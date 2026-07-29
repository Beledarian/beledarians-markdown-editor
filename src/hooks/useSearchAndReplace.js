import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getEditorScrollContainer = (editor) => (
  editor?.closest('.w-md-editor-area')
  || editor?.closest('.w-md-editor-text')
  || editor
);

const collectMatches = (markdown, query, matchCase, isRegex) => {
  const source = isRegex ? query : escapeRegExp(query);
  const regex = new RegExp(source, matchCase ? 'g' : 'gi');
  const matches = [];
  let match = regex.exec(markdown);

  while (match) {
    matches.push({
      index: match.index,
      length: match[0].length,
    });

    if (match[0].length === 0) {
      regex.lastIndex += 1;
    }
    match = regex.exec(markdown);
  }

  return matches;
};

const getRenderedMatchRect = (editor, start, end) => {
  const renderedText = editor
    ?.closest('.w-md-editor-text')
    ?.querySelector('.w-md-editor-text-pre');
  if (!renderedText || typeof document.createRange !== 'function') return null;

  const walker = document.createTreeWalker(renderedText, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let startNode = null;
  let startOffset = 0;
  let endNode = null;
  let endOffset = 0;
  let node = walker.nextNode();

  while (node) {
    const nextOffset = offset + node.textContent.length;
    if (!startNode && start <= nextOffset) {
      startNode = node;
      startOffset = Math.max(0, start - offset);
    }
    if (end <= nextOffset) {
      endNode = node;
      endOffset = Math.max(0, end - offset);
      break;
    }
    offset = nextOffset;
    node = walker.nextNode();
  }

  if (!startNode || !endNode) return null;

  try {
    range.setStart(startNode, Math.min(startOffset, startNode.textContent.length));
    range.setEnd(endNode, Math.min(endOffset, endNode.textContent.length));
    const rect = range.getBoundingClientRect?.();
    return rect && (rect.height > 0 || rect.width > 0) ? rect : null;
  } catch {
    return null;
  }
};

const scrollMatchIntoView = (editor, markdown, start, end) => {
  const scrollContainer = getEditorScrollContainer(editor);
  if (!scrollContainer) return;

  const renderedRect = getRenderedMatchRect(editor, start, end);
  const containerRect = scrollContainer.getBoundingClientRect?.();
  let targetTop;

  if (renderedRect && containerRect) {
    const matchTop = scrollContainer.scrollTop + renderedRect.top - containerRect.top;
    targetTop = matchTop - Math.max(24, scrollContainer.clientHeight / 3);
  } else {
    const computed = getComputedStyle(editor);
    const parsedLineHeight = Number.parseFloat(computed.lineHeight);
    const parsedFontSize = Number.parseFloat(computed.fontSize);
    const lineHeight = Number.isFinite(parsedLineHeight)
      ? parsedLineHeight
      : (Number.isFinite(parsedFontSize) ? parsedFontSize * 1.2 : 24);
    const line = markdown.slice(0, start).split('\n').length - 1;
    targetTop = (line * lineHeight) - (scrollContainer.clientHeight / 3);
  }

  const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
  const top = Math.min(Math.max(0, targetTop), maxScrollTop);
  if (typeof scrollContainer.scrollTo === 'function') {
    scrollContainer.scrollTo({ top, behavior: 'smooth' });
  } else {
    scrollContainer.scrollTop = top;
  }
};

/**
 * Custom hook managing search, replace, match indexing, and find/replace modal visibility.
 */
export function useSearchAndReplace(markdown, setMarkdown) {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  const handleFind = useCallback((query, matchCase = false, isRegex = false, backwards = false) => {
    setSearchQuery(query);
    if (!query) return;

    try {
      const matches = collectMatches(markdown, query, matchCase, isRegex);
      if (matches.length === 0) {
        setMatchIndex(0);
        toast('No occurrences found');
        return;
      }

      const editor = typeof document !== 'undefined'
        ? document.querySelector('.w-md-editor-text-input')
        : null;
      const selectionStart = editor?.selectionStart ?? 0;
      const selectionEnd = editor?.selectionEnd ?? selectionStart;

      let nextIndex;
      if (backwards) {
        nextIndex = -1;
        for (let index = matches.length - 1; index >= 0; index -= 1) {
          if (matches[index].index < selectionStart) {
            nextIndex = index;
            break;
          }
        }
        if (nextIndex === -1) nextIndex = matches.length - 1;
      } else {
        nextIndex = matches.findIndex((match) => match.index >= selectionEnd);
        if (nextIndex === -1) nextIndex = 0;
      }

      const match = matches[nextIndex];
      setMatchIndex(nextIndex);
      if (!editor) return;

      editor.setSelectionRange(match.index, match.index + match.length);
      editor.dispatchEvent(new Event('select', { bubbles: true }));
      scrollMatchIntoView(editor, markdown, match.index, match.index + match.length);
    } catch (error) {
      toast.error(`Invalid regex: ${error.message}`);
    }
  }, [markdown]);

  const handleReplace = useCallback((findText, replaceText, matchCase = false, isRegex = false) => {
    if (!findText) return;
    try {
      const flags = matchCase ? 'g' : 'gi';
      const regexStr = isRegex ? findText : escapeRegExp(findText);
      const regex = new RegExp(regexStr, flags);
      
      let replaced = false;
      const newVal = markdown.replace(regex, (match) => {
        if (!replaced) {
          replaced = true;
          return replaceText;
        }
        return match;
      });

      if (replaced) {
        setMarkdown(newVal);
        toast.success('Replaced 1 occurrence');
      } else {
        toast('No occurrences found');
      }
    } catch (e) {
      toast.error(`Invalid regex: ${e.message}`);
    }
  }, [markdown, setMarkdown]);

  const handleReplaceAll = useCallback((findText, replaceText, matchCase = false, isRegex = false) => {
    if (!findText) return;
    try {
      const flags = matchCase ? 'g' : 'gi';
      const regexStr = isRegex ? findText : escapeRegExp(findText);
      const regex = new RegExp(regexStr, flags);
      const count = (markdown.match(regex) || []).length;
      if (count > 0) {
        setMarkdown(markdown.replace(regex, () => replaceText));
        toast.success(`Replaced ${count} occurrences`);
      } else {
        toast('No occurrences found');
      }
    } catch (e) {
      toast.error(`Invalid regex: ${e.message}`);
    }
  }, [markdown, setMarkdown]);

  return {
    showGlobalSearch,
    setShowGlobalSearch,
    showFindReplace,
    setShowFindReplace,
    searchQuery,
    setSearchQuery,
    replaceQuery,
    setReplaceQuery,
    matchIndex,
    setMatchIndex,
    handleFind,
    handleReplace,
    handleReplaceAll
  };
}
