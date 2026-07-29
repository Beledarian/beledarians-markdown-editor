import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  applyFormatToFirstMatch,
  applyFormatToSelection,
  changeColor,
  removeFormat,
  toggleHighlightAtSelection,
  insertFormattingSyntax,
} from '../features/editor/formatting';

export function useAppFormatting({
  markdown,
  setMarkdown,
  setUnsavedChanges,
  contextMenu,
  setContextMenu
}) {
  const [floatingMenu, setFloatingMenu] = useState(null);
  const [lastFormat, setLastFormat] = useState({ type: 'highlight', color: '#ffff00', opacity: 0.5 });

  const insertTextAtCursor = useCallback((text) => {
    const editor = typeof document !== 'undefined' ? document.querySelector('.w-md-editor-text-input') : null;
    const start = editor?.selectionStart ?? -1;
    const end = editor?.selectionEnd ?? -1;
    setMarkdown(prev => {
      if (start >= 0) return prev.substring(0, start) + text + prev.substring(end);
      return prev + text;
    });
    if (editor) {
      setTimeout(() => {
        editor.selectionStart = start + text.length;
        editor.selectionEnd = start + text.length;
        editor.focus();
      }, 0);
    }
  }, [setMarkdown]);

  const applyFormat = useCallback((format, textToFormat = null) => {
    setLastFormat(format);

    const editor = typeof document !== 'undefined' ? document.querySelector('.w-md-editor-text-input') : null;
    const selection = textToFormat
      || (editor
        ? markdown.substring(editor.selectionStart, editor.selectionEnd)
        : (typeof window !== 'undefined' && window.getSelection ? window.getSelection().toString() : ''));

    if (!selection) {
      toast.error('No text selected');
      return;
    }

    const nextMarkdown = editor && !textToFormat
      ? applyFormatToSelection(markdown, {
          start: editor.selectionStart,
          end: editor.selectionEnd,
        }, format)
      : applyFormatToFirstMatch(markdown, selection, format);

    if (nextMarkdown === null) {
      toast.error('Could not find match in source');
      return;
    }

    setMarkdown(nextMarkdown);
    toast.success('Format applied');
  }, [markdown, setMarkdown]);

  const handleApplyLastFormat = useCallback(() => applyFormat(lastFormat), [applyFormat, lastFormat]);

  const handleFormatSyntax = useCallback((formatKind) => {
    const editor = typeof document !== 'undefined' ? document.querySelector('.w-md-editor-text-input') : null;
    const start = editor?.selectionStart ?? 0;
    const end = editor?.selectionEnd ?? 0;

    const nextMarkdown = insertFormattingSyntax(markdown, { start, end }, formatKind);
    setMarkdown(nextMarkdown);
    if (typeof setUnsavedChanges === 'function') {
      setUnsavedChanges(true);
    }

    if (editor) {
      setTimeout(() => {
        editor.focus();
      }, 0);
    }
  }, [markdown, setMarkdown, setUnsavedChanges]);

  const handleOpenFormatMenu = useCallback((type = 'highlight') => {
    if (typeof window === 'undefined' || !window.getSelection) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setFloatingMenu({
      x: rect.left,
      y: rect.bottom + 10,
      type: type
    });
  }, []);

  const applyColor = useCallback((color) => {
    const editor = typeof document !== 'undefined' ? document.querySelector('.w-md-editor-text-input') : null;
    if (editor) {
      const nextMarkdown = applyFormatToSelection(markdown, {
        start: editor.selectionStart,
        end: editor.selectionEnd,
      }, { type: 'color', color });
      if (nextMarkdown !== null) setMarkdown(nextMarkdown);
    } else {
      const selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
      const selectedText = selection ? selection.toString() : '';
      const nextMarkdown = applyFormatToFirstMatch(
        markdown,
        selectedText,
        { type: 'color', color },
      );
      if (nextMarkdown !== null) {
        setMarkdown(nextMarkdown);
        toast.success('Applied color to first match');
      } else if (selectedText) {
        toast.error('Could not match selection to source');
      }
    }
  }, [markdown, setMarkdown]);

  const handleColorChange = useCallback((colorOrEvent) => {
    const color = colorOrEvent?.target?.value || colorOrEvent;
    applyColor(color);
  }, [applyColor]);

  const handleHighlight = useCallback(() => {
    const editor = typeof document !== 'undefined' ? document.querySelector('.w-md-editor-text-input') : null;
    if (editor) {
      const nextMarkdown = toggleHighlightAtSelection(markdown, {
        start: editor.selectionStart,
        end: editor.selectionEnd,
      });
      if (nextMarkdown !== null) setMarkdown(nextMarkdown);
    } else {
      const selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
      const selectedText = selection ? selection.toString() : '';
      const nextMarkdown = applyFormatToFirstMatch(markdown, selectedText, {
        type: 'highlight',
        color: '#ffff00',
        opacity: 0.5,
      });
      if (nextMarkdown !== null) {
        setMarkdown(nextMarkdown);
        toast.success('Highlighted first match');
      } else if (selectedText) {
        toast.error('Could not match selection to source');
      }
    }
  }, [markdown, setMarkdown]);

  const handleRemoveFormat = useCallback(() => {
    if (!contextMenu) return;
    const { type, text } = contextMenu;

    const nextMarkdown = removeFormat(markdown, type, text);
    if (nextMarkdown === null) {
      toast.error('Could not find match in source');
    } else {
      setMarkdown(nextMarkdown);
      toast.success(type === 'highlight' ? 'Highlight removed' : 'Color removed');
    }
    if (typeof setContextMenu === 'function') {
      setContextMenu(null);
    }
  }, [contextMenu, markdown, setMarkdown, setContextMenu]);

  const handleChangeColor = useCallback((newColor) => {
    if (!contextMenu || contextMenu.type !== 'color') return;
    const nextMarkdown = changeColor(markdown, contextMenu.text, newColor);

    if (nextMarkdown === null) {
      toast.error('Could not find match in source');
    } else {
      setMarkdown(nextMarkdown);
      toast.success('Color updated');
    }
    if (typeof setContextMenu === 'function') {
      setContextMenu(null);
    }
  }, [contextMenu, markdown, setMarkdown, setContextMenu]);

  const handleInsertTimestamp = useCallback(() => {
    const ts = new Date().toISOString();
    insertTextAtCursor(`\n> ${ts}\n`);
  }, [insertTextAtCursor]);

  const handleInsertTemplate = useCallback((templateContent) => {
    insertTextAtCursor(templateContent);
    toast.success('Template inserted');
  }, [insertTextAtCursor]);

  return {
    floatingMenu,
    setFloatingMenu,
    lastFormat,
    insertTextAtCursor,
    applyFormat,
    handleApplyLastFormat,
    handleFormatSyntax,
    handleOpenFormatMenu,
    applyColor,
    handleColorChange,
    handleHighlight,
    handleRemoveFormat,
    handleChangeColor,
    handleInsertTimestamp,
    handleInsertTemplate
  };
}
