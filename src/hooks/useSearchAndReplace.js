import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { toast } from 'react-hot-toast';

const FIND_RESULTS_HIGHLIGHT = 'md-find-results';
const FIND_CURRENT_HIGHLIGHT = 'md-find-current';

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

const indexDomText = (root) => {
  if (!root || typeof document.createTreeWalker !== 'function') {
    return { nodes: [], text: '' };
  }

  const walker = document.createTreeWalker(
    root,
    globalThis.NodeFilter?.SHOW_TEXT ?? 4,
  );
  const nodes = [];
  let text = '';
  let node = walker.nextNode();
  while (node) {
    nodes.push({
      node,
      start: text.length,
      end: text.length + node.textContent.length,
    });
    text += node.textContent;
    node = walker.nextNode();
  }
  return { nodes, text };
};

const createDomRange = (nodes, start, end) => {
  if (typeof document.createRange !== 'function') return null;

  const startEntry = nodes.find((entry) => start <= entry.end);
  const endEntry = nodes.find((entry) => end <= entry.end);
  if (!startEntry || !endEntry) return null;

  const range = document.createRange();
  try {
    range.setStart(
      startEntry.node,
      Math.min(Math.max(0, start - startEntry.start), startEntry.node.textContent.length),
    );
    range.setEnd(
      endEntry.node,
      Math.min(Math.max(0, end - endEntry.start), endEntry.node.textContent.length),
    );
    return range;
  } catch {
    return null;
  }
};

const collectDomMatchRanges = (root, query, matchCase, isRegex) => {
  const { nodes, text } = indexDomText(root);
  return collectMatches(text, query, matchCase, isRegex)
    .map((match) => ({
      ...match,
      range: createDomRange(nodes, match.index, match.index + match.length),
      segments: nodes
        .filter((entry) => (
          entry.start < match.index + match.length
          && entry.end > match.index
        ))
        .map((entry) => ({
          node: entry.node,
          start: Math.max(0, match.index - entry.start),
          end: Math.min(entry.node.length, match.index + match.length - entry.start),
        })),
    }))
    .filter((match) => match.range);
};

const clearFindHighlights = () => {
  const registry = globalThis.CSS?.highlights;
  registry?.delete(FIND_RESULTS_HIGHLIGHT);
  registry?.delete(FIND_CURRENT_HIGHLIGHT);
  const parents = new Set();
  document.querySelectorAll('mark.md-find-highlight').forEach((mark) => {
    if (mark.parentNode) parents.add(mark.parentNode);
    mark.replaceWith(...mark.childNodes);
  });
  parents.forEach((parent) => parent.normalize());
};

const applyFindHighlights = (allRanges, currentRanges = []) => {
  const registry = globalThis.CSS?.highlights;
  const HighlightConstructor = globalThis.Highlight;
  if (!registry || typeof HighlightConstructor !== 'function') return false;

  registry.set(FIND_RESULTS_HIGHLIGHT, new HighlightConstructor(...allRanges));
  if (currentRanges.length > 0) {
    registry.set(FIND_CURRENT_HIGHLIGHT, new HighlightConstructor(...currentRanges));
  } else {
    registry.delete(FIND_CURRENT_HIGHLIGHT);
  }
  return true;
};

const wrapTextSegments = (segments, isCurrent) => {
  segments.slice().reverse().forEach(({ node: textNode, start, end }) => {
    if (end <= start) return;

    let selectedNode = textNode;
    if (end < selectedNode.length) selectedNode.splitText(end);
    if (start > 0) selectedNode = selectedNode.splitText(start);

    const mark = document.createElement('mark');
    mark.className = isCurrent
      ? 'md-find-highlight md-find-highlight-current'
      : 'md-find-highlight';
    selectedNode.parentNode?.insertBefore(mark, selectedNode);
    mark.appendChild(selectedNode);
  });
};

const applyFallbackHighlights = (domMatches, currentIndex) => {
  ['editor', 'preview'].forEach((pane) => {
    const matches = domMatches[pane];
    const activeIndex = currentIndex < 0 || matches.length === 0
      ? -1
      : currentIndex % matches.length;
    matches
      .map((match, index) => ({ ...match, index }))
      .reverse()
      .forEach((match) => wrapTextSegments(match.segments, match.index === activeIndex));
  });
};

const getFindDomMatches = (query, matchCase, isRegex) => {
  const editorRoot = document.querySelector('.w-md-editor-text-pre');
  const previewContainer = document.querySelector(
    '.w-md-editor-preview, .w-md-editor-show-preview',
  );
  const previewRoot = previewContainer?.querySelector('.wmde-markdown')
    || previewContainer;
  return {
    editor: collectDomMatchRanges(editorRoot, query, matchCase, isRegex),
    preview: collectDomMatchRanges(previewRoot, query, matchCase, isRegex),
  };
};

const updateFindHighlights = (query, matchCase, isRegex, currentIndex = -1) => {
  clearFindHighlights();
  if (!query) {
    return { editor: [], preview: [] };
  }

  const domMatches = getFindDomMatches(query, matchCase, isRegex);
  const allRanges = [
    ...domMatches.editor.map((match) => match.range),
    ...domMatches.preview.map((match) => match.range),
  ];
  const currentRanges = currentIndex < 0
    ? []
    : [
      domMatches.editor[currentIndex % Math.max(1, domMatches.editor.length)]?.range,
      domMatches.preview[currentIndex % Math.max(1, domMatches.preview.length)]?.range,
    ].filter(Boolean);
  if (!applyFindHighlights(allRanges, currentRanges)) {
    applyFallbackHighlights(domMatches, currentIndex);
    return getFindDomMatches(query, matchCase, isRegex);
  }
  return domMatches;
};

const getRangeRect = (range) => {
  const rect = range?.getBoundingClientRect?.();
  if (rect && (rect.height > 0 || rect.width > 0)) return rect;
  const parent = range?.startContainer?.parentElement;
  return parent?.getBoundingClientRect?.() || null;
};

const scrollMatchIntoView = (editor, markdown, start, end) => {
  const scrollContainer = getEditorScrollContainer(editor);
  if (!scrollContainer) return;

  const renderedText = editor
    ?.closest('.w-md-editor-text')
    ?.querySelector('.w-md-editor-text-pre');
  const renderedIndex = indexDomText(renderedText);
  const renderedRange = createDomRange(renderedIndex.nodes, start, end);
  const renderedRect = getRangeRect(renderedRange);
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

const scrollPreviewRangeIntoView = (range) => {
  const preview = range?.startContainer?.parentElement?.closest(
    '.w-md-editor-preview, .w-md-editor-show-preview',
  );
  if (!preview) return;

  const rangeRect = getRangeRect(range);
  const previewRect = preview.getBoundingClientRect?.();
  const matchTop = rangeRect && previewRect
    ? preview.scrollTop + rangeRect.top - previewRect.top
    : preview.scrollTop;
  const maxScrollTop = Math.max(0, preview.scrollHeight - preview.clientHeight);
  const top = Math.min(
    Math.max(0, matchTop - Math.max(24, preview.clientHeight / 3)),
    maxScrollTop,
  );
  if (typeof preview.scrollTo === 'function') {
    preview.scrollTo({ top, behavior: 'smooth' });
  } else {
    preview.scrollTop = top;
  }
};

/**
 * Custom hook managing search, replace, match indexing, and find/replace modal visibility.
 */
export function useSearchAndReplace(markdown, setMarkdown, viewMode) {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const previewFindRef = useRef({
    signature: '',
    index: -1,
  });
  const documentFindRef = useRef({
    signature: '',
    index: -1,
  });
  const highlightRequestRef = useRef({
    query: '',
    matchCase: false,
    isRegex: false,
  });

  useEffect(() => {
    if (!showFindReplace) clearFindHighlights();
    return undefined;
  }, [showFindReplace]);

  useEffect(() => () => clearFindHighlights(), []);

  const handleHighlightFind = useCallback((query, matchCase = false, isRegex = false) => {
    highlightRequestRef.current = { query, matchCase, isRegex };
    try {
      const matches = updateFindHighlights(query, matchCase, isRegex);
      const editor = document.querySelector('.w-md-editor-text-input');
      return editor
        ? collectMatches(markdown, query, matchCase, isRegex).length
        : matches.preview.length;
    } catch {
      clearFindHighlights();
      return 0;
    }
  }, [markdown]);

  useEffect(() => {
    if (!showFindReplace) return undefined;
    const refresh = () => {
      const { query, matchCase, isRegex } = highlightRequestRef.current;
      if (query) updateFindHighlights(query, matchCase, isRegex, matchIndex);
    };
    const frame = requestAnimationFrame(refresh);
    const delayedRefresh = setTimeout(refresh, 200);
    const root = document.querySelector('.editor-container');
    const observerOptions = { childList: true, characterData: true, subtree: true };
    const supportsCustomHighlights = Boolean(
      globalThis.CSS?.highlights && typeof globalThis.Highlight === 'function',
    );
    const observer = supportsCustomHighlights && root && typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => {
        observer.disconnect();
        refresh();
        observer.observe(root, observerOptions);
      })
      : null;
    observer?.observe(root, observerOptions);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(delayedRefresh);
      observer?.disconnect();
    };
  }, [markdown, matchIndex, showFindReplace, viewMode]);

  const handleFind = useCallback((query, matchCase = false, isRegex = false, backwards = false) => {
    setSearchQuery(query);
    if (!query) return;

    try {
      const editor = typeof document !== 'undefined'
        ? document.querySelector('.w-md-editor-text-input')
        : null;
      if (!editor) {
        const domMatches = getFindDomMatches(query, matchCase, isRegex);
        if (domMatches.preview.length === 0) {
          setMatchIndex(0);
          clearFindHighlights();
          toast('No occurrences found');
          return;
        }

        const signature = `${matchCase}:${isRegex}:${query}`;
        const isNewSearch = previewFindRef.current.signature !== signature;
        const previousIndex = previewFindRef.current.index;
        const nextIndex = isNewSearch
          ? (backwards ? domMatches.preview.length - 1 : 0)
          : (
            previousIndex
            + (backwards ? -1 : 1)
            + domMatches.preview.length
          ) % domMatches.preview.length;

        previewFindRef.current = { signature, index: nextIndex };
        setMatchIndex(nextIndex);
        const highlightedMatches = updateFindHighlights(
          query,
          matchCase,
          isRegex,
          nextIndex,
        );

        const currentRange = highlightedMatches.preview[nextIndex].range;
        const selection = globalThis.getSelection?.();
        selection?.removeAllRanges();
        selection?.addRange(currentRange);
        scrollPreviewRangeIntoView(currentRange);
        return;
      }

      const matches = collectMatches(markdown, query, matchCase, isRegex);
      if (matches.length === 0) {
        setMatchIndex(0);
        clearFindHighlights();
        toast('No occurrences found');
        return;
      }

      const selectionStart = editor?.selectionStart ?? 0;
      const selectionEnd = editor?.selectionEnd ?? selectionStart;
      const signature = `${matchCase}:${isRegex}:${query}`;
      const isNewSearch = documentFindRef.current.signature !== signature;

      let nextIndex;
      if (!isNewSearch) {
        nextIndex = (
          documentFindRef.current.index
          + (backwards ? -1 : 1)
          + matches.length
        ) % matches.length;
      } else if (backwards) {
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
      documentFindRef.current = { signature, index: nextIndex };
      setMatchIndex(nextIndex);
      updateFindHighlights(query, matchCase, isRegex, nextIndex);
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
      const regexStr = isRegex ? findText : escapeRegExp(findText);
      const matches = collectMatches(markdown, findText, matchCase, isRegex);
      const signature = `${matchCase}:${isRegex}:${findText}`;
      const activeIndex = documentFindRef.current.signature === signature
        ? documentFindRef.current.index
        : (
          previewFindRef.current.signature === signature
            ? previewFindRef.current.index
            : 0
        );
      const match = matches[activeIndex];

      if (match) {
        const matchedText = markdown.slice(match.index, match.index + match.length);
        const singleRegex = new RegExp(regexStr, matchCase ? '' : 'i');
        const replacement = matchedText.replace(singleRegex, replaceText);
        const newVal = markdown.slice(0, match.index)
          + replacement
          + markdown.slice(match.index + match.length);
        setMarkdown(newVal);
        documentFindRef.current = { signature: '', index: -1 };
        previewFindRef.current = { signature: '', index: -1 };
        clearFindHighlights();
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
        setMarkdown(markdown.replace(regex, replaceText));
        documentFindRef.current = { signature: '', index: -1 };
        previewFindRef.current = { signature: '', index: -1 };
        clearFindHighlights();
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
    handleHighlightFind,
    handleReplace,
    handleReplaceAll
  };
}
