import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';

export function useTabOperations({
  openFiles,
  setOpenFiles,
  activeFileId,
  setActiveFileId,
  switchTab,
  files = [],
  assets = [],
  setMarkdown,
  setUnsavedChanges,
  setCurrentFile,
  setLastSaved
}) {
  const handleCloseOtherTabs = useCallback((path) => {
    setOpenFiles(prev => prev.filter(f => f.path === path));
    if (activeFileId !== path) switchTab(path);
  }, [activeFileId, setOpenFiles, switchTab]);

  const handleCloseTabsToRight = useCallback((path) => {
    setOpenFiles(prev => {
      const idx = prev.findIndex(f => f.path === path);
      if (idx === -1) return prev;
      return prev.slice(0, idx + 1);
    });
  }, [setOpenFiles]);

  const handleDuplicateTab = useCallback((path) => {
    const target = openFiles.find(f => f.path === path);
    if (!target) return;
    const dupPath = `${target.path}_copy_${Date.now()}`;
    const dupTab = {
      ...target,
      name: `${target.name} (Copy)`,
      path: dupPath,
      unsaved: true,
    };
    setOpenFiles(prev => [...prev, dupTab]);
    switchTab(dupPath);
    toast.success('Tab duplicated');
  }, [openFiles, setOpenFiles, switchTab]);

  const handleCopyTabPath = useCallback((path) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(path).then(() => {
        toast.success('File path copied to clipboard');
      }).catch(() => {
        toast.error('Failed to copy path');
      });
    } else {
      toast.error('Failed to copy path');
    }
  }, []);

  const handleTabReorder = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setOpenFiles(prev => {
      const newOpenFiles = [...prev];
      const [movedTab] = newOpenFiles.splice(fromIndex, 1);
      newOpenFiles.splice(toIndex, 0, movedTab);
      return newOpenFiles;
    });
  }, [setOpenFiles]);

  const handleFileDropOnTab = useCallback(async (fileData, dropIndex) => {
    const existingIndex = openFiles.findIndex(f => f.path === fileData.path);
    if (existingIndex !== -1) {
      handleTabReorder(existingIndex, dropIndex);
      switchTab(fileData.path);
      return;
    }

    const targetFile = files.find(f => f.path === fileData.path) || assets.find(f => f.path === fileData.path);

    if (targetFile) {
      try {
        let text = "";
        if (targetFile.handle && typeof targetFile.handle.getFile === "function") {
          const file = await targetFile.handle.getFile();
          text = await file.text();
        } else if (targetFile.path) {
          if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
            text = await invoke("read_file", { path: targetFile.path });
          } else {
            const response = await fetch("file:///" + targetFile.path.replace(/\\/g, "/"));
            text = await response.text();
          }
        }

        const newTab = {
          name: targetFile.name,
          path: targetFile.path,
          handle: targetFile.handle,
          content: text,
          unsaved: false
        };

        setOpenFiles(prev => {
          const newOpenFiles = [...prev];
          newOpenFiles.splice(dropIndex + 1, 0, newTab);
          return newOpenFiles;
        });
        setActiveFileId(newTab.path);
        setMarkdown(text);
        setUnsavedChanges(false);
        if (typeof setCurrentFile === 'function') {
          setCurrentFile(targetFile);
        }
        if (typeof setLastSaved === 'function') {
          setLastSaved(Date.now());
        }
      } catch (err) {
        console.error("Error opening dropped file", err);
        toast.error("Failed to open file");
      }
    }
  }, [openFiles, files, assets, handleTabReorder, switchTab, setOpenFiles, setActiveFileId, setMarkdown, setUnsavedChanges, setCurrentFile, setLastSaved]);

  return {
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleDuplicateTab,
    handleCopyTabPath,
    handleTabReorder,
    handleFileDropOnTab
  };
}
