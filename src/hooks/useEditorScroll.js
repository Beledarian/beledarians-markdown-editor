import { useEffect, useRef } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getScrollMax = (element) => Math.max(
  0,
  (element?.scrollHeight || 0) - (element?.clientHeight || 0),
);

const interpolate = (anchors, value, inputKey, outputKey) => {
  if (anchors.length === 0) return 0;
  if (value <= anchors[0][inputKey]) return anchors[0][outputKey];

  for (let index = 1; index < anchors.length; index += 1) {
    const upper = anchors[index];
    if (value > upper[inputKey]) continue;

    const lower = anchors[index - 1];
    const span = upper[inputKey] - lower[inputKey];
    if (span <= 0) return upper[outputKey];

    const progress = (value - lower[inputKey]) / span;
    return lower[outputKey] + ((upper[outputKey] - lower[outputKey]) * progress);
  }

  return anchors[anchors.length - 1][outputKey];
};

const getLineHeight = (element) => {
  const computed = getComputedStyle(element);
  const parsed = parseFloat(computed.lineHeight);
  if (Number.isFinite(parsed)) return parsed;

  const fontSize = parseFloat(computed.fontSize);
  return Number.isFinite(fontSize) ? fontSize * 1.2 : 24;
};

const getSourceLineCount = (editor) => (
  Math.max(1, String(editor?.value || '').split('\n').length)
);

const createPreviewAnchors = (preview, totalLines) => {
  const previewMax = getScrollMax(preview);
  const previewRect = preview.getBoundingClientRect();
  const lineToTop = new Map();

  for (const element of preview.querySelectorAll('[data-source-line]')) {
    const line = Number.parseInt(element.getAttribute('data-source-line'), 10);
    if (!Number.isFinite(line)) continue;

    const top = preview.scrollTop
      + element.getBoundingClientRect().top
      - previewRect.top;
    const previousTop = lineToTop.get(line);
    if (previousTop === undefined || top < previousTop) {
      lineToTop.set(line, top);
    }
  }

  const measured = Array.from(lineToTop, ([line, top]) => ({ line, top }))
    .sort((left, right) => left.line - right.line);

  if (measured.length === 0) return [];

  const baseTop = measured[0].top;
  const anchors = measured.map(({ line, top }) => ({
    line,
    top: clamp(top - baseTop, 0, previewMax),
  }));

  if (anchors[0].line > 1) {
    anchors.unshift({ line: 1, top: 0 });
  } else {
    anchors[0].top = 0;
  }

  const finalLine = Math.max(totalLines, anchors[anchors.length - 1].line);
  const finalAnchor = anchors[anchors.length - 1];
  if (finalAnchor.line < finalLine) {
    anchors.push({ line: finalLine, top: previewMax });
  } else if (anchors.length > 1) {
    finalAnchor.top = previewMax;
  }

  return anchors;
};

const createInverseAnchors = (anchors) => {
  const inverse = [];

  for (const anchor of anchors) {
    const previous = inverse[inverse.length - 1];
    if (previous && Math.abs(previous.top - anchor.top) < 0.5) {
      previous.line = Math.max(previous.line, anchor.line);
    } else {
      inverse.push({ ...anchor });
    }
  }

  return inverse;
};

/**
 * Synchronizes the editor and rendered preview with a continuous, cached
 * source-line mapping. Sparse Markdown anchors are interpolated instead of
 * snapped, which keeps split-view wheel scrolling stable.
 */
export const useEditorScroll = (activeFileId, scrollSynced = true) => {
  const scrollMemoryRef = useRef({});
  const scrollSyncedRef = useRef(scrollSynced);
  const editorRafRef = useRef(null);
  const previewRafRef = useRef(null);

  useEffect(() => {
    scrollSyncedRef.current = scrollSynced;
  }, [scrollSynced]);

  useEffect(() => {
    let boundEditor = null;
    let boundPreview = null;
    let restoredEditor = null;
    let restoredPreview = null;
    let observer = null;
    let observerTimer = null;
    let resizeObserver = null;
    let ignoredEditorTop = null;
    let ignoredPreviewTop = null;
    let anchorsDirty = true;
    let anchorCache = {
      preview: null,
      totalLines: 0,
      scrollHeight: 0,
      clientHeight: 0,
      anchors: [],
      inverse: [],
    };

    const getEditorScrollOwner = () => (
      document.querySelector('.w-md-editor-area')
      || document.querySelector('.w-md-editor-text-input')
    );

    const getEditorInput = (scrollOwner) => (
      scrollOwner?.querySelector?.('.w-md-editor-text-input')
      || document.querySelector('.w-md-editor-text-input')
      || scrollOwner
    );

    const remember = (pane, scrollTop) => {
      if (!activeFileId) return;
      if (!scrollMemoryRef.current[activeFileId]) {
        scrollMemoryRef.current[activeFileId] = {};
      }
      scrollMemoryRef.current[activeFileId][pane] = scrollTop;
    };

    const takeEditorControl = () => {
      ignoredEditorTop = null;
      if (previewRafRef.current) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
    };

    const takePreviewControl = () => {
      ignoredPreviewTop = null;
      if (editorRafRef.current) {
        cancelAnimationFrame(editorRafRef.current);
        editorRafRef.current = null;
      }
    };

    const getAnchors = (preview, editorInput) => {
      const totalLines = getSourceLineCount(editorInput);
      const cacheIsValid = !anchorsDirty
        && anchorCache.preview === preview
        && anchorCache.totalLines === totalLines
        && anchorCache.scrollHeight === preview.scrollHeight
        && anchorCache.clientHeight === preview.clientHeight;

      if (!cacheIsValid) {
        const anchors = createPreviewAnchors(preview, totalLines);
        anchorCache = {
          preview,
          totalLines,
          scrollHeight: preview.scrollHeight,
          clientHeight: preview.clientHeight,
          anchors,
          inverse: createInverseAnchors(anchors),
        };
        anchorsDirty = false;
      }

      return anchorCache;
    };

    const syncEditorToPreview = (editor, preview) => {
      const editorInput = getEditorInput(editor);
      const lineHeight = getLineHeight(editorInput);
      const { anchors, totalLines } = getAnchors(preview, editorInput);
      const previewMax = getScrollMax(preview);
      const editorMax = getScrollMax(editor);

      const target = anchors.length > 1
        ? interpolate(
          anchors,
          clamp((editor.scrollTop / lineHeight) + 1, 1, totalLines),
          'line',
          'top',
        )
        : (editorMax > 0 ? (editor.scrollTop / editorMax) * previewMax : 0);

      const nextTop = clamp(target, 0, previewMax);
      if (Math.abs(preview.scrollTop - nextTop) < 0.5) return;

      ignoredPreviewTop = nextTop;
      preview.scrollTop = nextTop;
      remember('preview', preview.scrollTop);
    };

    const syncPreviewToEditor = (preview, editor) => {
      const editorInput = getEditorInput(editor);
      const lineHeight = getLineHeight(editorInput);
      const { inverse } = getAnchors(preview, editorInput);
      const editorMax = getScrollMax(editor);
      const previewMax = getScrollMax(preview);

      const target = inverse.length > 1
        ? (interpolate(inverse, preview.scrollTop, 'top', 'line') - 1) * lineHeight
        : (previewMax > 0 ? (preview.scrollTop / previewMax) * editorMax : 0);

      const nextTop = clamp(target, 0, editorMax);
      if (Math.abs(editor.scrollTop - nextTop) < 0.5) return;

      ignoredEditorTop = nextTop;
      editor.scrollTop = nextTop;
      remember('editor', editor.scrollTop);
    };

    const handleEditorScroll = (event) => {
      const editor = event.currentTarget;
      remember('editor', editor.scrollTop);
      if (ignoredEditorTop !== null) {
        const isProgrammaticScroll = Math.abs(editor.scrollTop - ignoredEditorTop) < 1;
        ignoredEditorTop = null;
        if (isProgrammaticScroll) return;
      }
      if (!scrollSyncedRef.current) return;

      const preview = document.querySelector('.w-md-editor-preview');
      if (!preview) return;

      if (editorRafRef.current) cancelAnimationFrame(editorRafRef.current);
      editorRafRef.current = requestAnimationFrame(() => {
        editorRafRef.current = null;
        syncEditorToPreview(editor, preview);
      });
    };

    const handlePreviewScroll = (event) => {
      const preview = event.currentTarget;
      remember('preview', preview.scrollTop);
      if (ignoredPreviewTop !== null) {
        const isProgrammaticScroll = Math.abs(preview.scrollTop - ignoredPreviewTop) < 1;
        ignoredPreviewTop = null;
        if (isProgrammaticScroll) return;
      }
      if (!scrollSyncedRef.current) return;

      const editor = getEditorScrollOwner();
      if (!editor) return;

      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = requestAnimationFrame(() => {
        previewRafRef.current = null;
        syncPreviewToEditor(preview, editor);
      });
    };

    const unbindEditor = () => {
      boundEditor?.removeEventListener('scroll', handleEditorScroll);
      boundEditor?.removeEventListener('wheel', takeEditorControl);
      boundEditor?.removeEventListener('pointerdown', takeEditorControl);
    };

    const unbindPreview = () => {
      boundPreview?.removeEventListener('scroll', handlePreviewScroll);
      boundPreview?.removeEventListener('wheel', takePreviewControl);
      boundPreview?.removeEventListener('pointerdown', takePreviewControl);
    };

    const setupScrollHandlers = () => {
      const editor = getEditorScrollOwner();
      const preview = document.querySelector('.w-md-editor-preview');
      anchorsDirty = true;

      const saved = activeFileId ? scrollMemoryRef.current[activeFileId] : null;
      if (saved) {
        if (editor && editor !== restoredEditor && saved.editor !== undefined) {
          editor.scrollTop = saved.editor;
        }
        if (preview && preview !== restoredPreview && saved.preview !== undefined) {
          preview.scrollTop = saved.preview;
        }
      }
      restoredEditor = editor;
      restoredPreview = preview;

      if (editor !== boundEditor) {
        unbindEditor();
        boundEditor = editor;
        boundEditor?.addEventListener('scroll', handleEditorScroll, { passive: true });
        boundEditor?.addEventListener('wheel', takeEditorControl, { passive: true });
        boundEditor?.addEventListener('pointerdown', takeEditorControl, { passive: true });
      }

      if (preview !== boundPreview) {
        unbindPreview();
        resizeObserver?.disconnect();
        boundPreview = preview;
        boundPreview?.addEventListener('scroll', handlePreviewScroll, { passive: true });
        boundPreview?.addEventListener('wheel', takePreviewControl, { passive: true });
        boundPreview?.addEventListener('pointerdown', takePreviewControl, { passive: true });

        if (boundPreview && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            anchorsDirty = true;
          });
          resizeObserver.observe(boundPreview);
        }
      }
    };

    const setupTimer = setTimeout(setupScrollHandlers, 100);
    const targetContainer = document.querySelector('.w-md-editor')
      || document.querySelector('.app');

    if (targetContainer) {
      observer = new MutationObserver(() => {
        anchorsDirty = true;
        clearTimeout(observerTimer);
        observerTimer = setTimeout(setupScrollHandlers, 100);
      });
      observer.observe(targetContainer, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(setupTimer);
      clearTimeout(observerTimer);
      if (editorRafRef.current) cancelAnimationFrame(editorRafRef.current);
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      observer?.disconnect();
      resizeObserver?.disconnect();
      unbindEditor();
      unbindPreview();
    };
  }, [activeFileId]);
};
