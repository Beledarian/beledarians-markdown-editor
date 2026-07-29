import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_SHORTCUTS = {
  newDoc: 'Ctrl+N',
  openDoc: 'Ctrl+O',
  save: 'Ctrl+S',
  saveAs: 'Ctrl+Shift+S',
  sidebar: 'Ctrl+B',
  theme: 'Ctrl+Shift+T',
  html: 'Ctrl+Shift+H',
  print: 'Ctrl+P',
  copyAll: 'Ctrl+Shift+C',
  settings: 'Ctrl+,',
  zen: 'Alt+Z',
  zoomIn: 'Ctrl+=',
  zoomOut: 'Ctrl+-',
  resetZoom: 'Ctrl+0',
  timestamp: 'Ctrl+Alt+T',
  cheatsheet: 'Ctrl+/',
  applyLastFormat: 'Ctrl+Shift+L', // changed to not conflict with Find & Replace
  openFormatMenu: 'Ctrl+Shift+M', // changed to not conflict with Find & Replace
  openColorMenu: 'Ctrl+Alt+C',
  findReplace: 'Ctrl+H',
  globalSearch: 'Ctrl+F' // Find modal toggle
};

export const useShortcuts = (handlers) => {
  const handlersRef = useRef(handlers);
  // Keep ref in sync on every render so the keydown closure always calls the latest handlers
  useEffect(() => { handlersRef.current = handlers; });

  const [shortcuts, setShortcuts] = useState(() => {
    const saved = localStorage.getItem('md-shortcuts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge defaults to ensure new keys are present (e.g. copyAll)
        // We prioritize saved values, but if a key is missing in saved, we take default.
        const merged = { ...DEFAULT_SHORTCUTS, ...parsed };
        // Cleanup legacy 'copy' which is now native
        if (merged.copy) delete merged.copy;
        return merged;
      } catch {
        // Corrupted localStorage entry — fall back to defaults
        localStorage.removeItem('md-shortcuts');
      }
    }
    return DEFAULT_SHORTCUTS;
  });

  const updateShortcut = useCallback((action, newCombo) => {
    const newShortcuts = { ...shortcuts, [action]: newCombo };
    setShortcuts(newShortcuts);
    localStorage.setItem('md-shortcuts', JSON.stringify(newShortcuts));
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const match = (shortcutKey) => {
        if (!shortcuts[shortcutKey]) return false;
        const parts = shortcuts[shortcutKey].toUpperCase().split('+');
        const key = parts.pop();

        // Special case for Function keys and standard keys
        let eventKey = e.key.toUpperCase();
        if (eventKey === 'CONTROL') return false;
        if (eventKey === 'ALT') return false;
        if (eventKey === 'SHIFT') return false;
        if (eventKey === 'META') return false;

        const codeMatches = eventKey === key || (e.code && (e.code.toUpperCase() === `KEY${key}` || e.code.toUpperCase() === key));

        const hasmodifier = parts.includes('CTRL') || parts.includes('META');
        const pressedModifier = e.ctrlKey || e.metaKey;
        const ctrlMatches = hasmodifier === pressedModifier; // Support Mac Command
        const shiftMatches = parts.includes('SHIFT') === e.shiftKey;
        const altMatches = parts.includes('ALT') === e.altKey;

        return codeMatches && ctrlMatches && shiftMatches && altMatches;
      };

      for (const action in handlersRef.current) {
        if (match(action)) {
          e.preventDefault();
          handlersRef.current[action]();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]); // stable — only re-registers when shortcut config changes, not on every handler update

  return { shortcuts, updateShortcut };
};
