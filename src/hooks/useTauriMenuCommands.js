import { useEffect } from 'react';

/**
 * Custom hook managing Tauri native menu event listeners with race-condition-safe cleanup.
 */
export function useTauriMenuCommands(actions) {
  const {
    handleNewDoc,
    handleOpenDoc,
    handleSaveFile,
    handleSaveAs,
    handleExportPDF,
    handleExportHTML,
    setSidebarOpen,
    setShowMiniMap
  } = actions;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;

    let isMounted = true;
    let unlistens = [];

    const setupListeners = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        
        const listeners = await Promise.all([
          listen('menu-new', () => handleNewDoc?.()),
          listen('menu-open', () => handleOpenDoc?.()),
          listen('menu-save', () => handleSaveFile?.()),
          listen('menu-save-as', () => handleSaveAs?.()),
          listen('menu-export-pdf', () => handleExportPDF?.()),
          listen('menu-export-html', () => handleExportHTML?.()),
          listen('menu-toggle-sidebar', () => setSidebarOpen?.(prev => !prev)),
          listen('menu-toggle-minimap', () => setShowMiniMap?.(prev => !prev))
        ]);

        if (!isMounted) {
          listeners.forEach(unlisten => unlisten && unlisten());
        } else {
          unlistens = listeners;
        }
      } catch (err) {
        console.warn('Tauri menu listener registration skipped:', err);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      unlistens.forEach(unlisten => unlisten && unlisten());
    };
  }, [handleNewDoc, handleOpenDoc, handleSaveFile, handleSaveAs, handleExportPDF, handleExportHTML, setSidebarOpen, setShowMiniMap]);
}
