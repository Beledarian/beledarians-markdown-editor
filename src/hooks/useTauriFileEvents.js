import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ask } from '@tauri-apps/plugin-dialog';

export function useTauriFileEvents({
  openFileInTab,
  createFile,
  currentFile,
  files = [],
  saveFile,
  switchTab,
  openFilesRef,
  markdownRef,
  activeFileIdRef,
  unsavedChangesRef,
  setLastSaved,
  setUnsavedChanges,
  setCurrentFile,
  setOpenFiles,
  setShowPrintModal
}) {
  const handleOpenFile = useCallback(async (filePath) => {
    try {
      let text = '';
      let lastMod = Date.now();
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
        text = await invoke('read_file', { path: filePath });
        try {
          const modTime = await invoke('get_file_last_modified', { path: filePath });
          if (modTime) lastMod = modTime;
        } catch (e) { console.warn("Could not get file metadata", e); }
      } else {
        try {
          text = await invoke('read_file', { path: filePath });
          try {
            const modTime = await invoke('get_file_last_modified', { path: filePath });
            if (modTime) lastMod = modTime;
          } catch { }
        } catch (e) {
          console.warn("Tauri invoke failed, trying fetch", e);
          const response = await fetch('file:///' + filePath.replace(/\\/g, '/'));
          if (!response.ok) throw new Error('Failed to load file');
          text = await response.text();
        }
      }

      const fileName = filePath.replace(/^.*[/\\]/, '');
      const fileObj = { name: fileName, path: filePath, handle: null, lastModified: lastMod };
      openFileInTab(fileObj, text);
      toast.success(`Opened ${fileName}`);
    } catch (err) {
      console.error("Error loading file", err);
      toast.error("Could not load file");
    }
  }, [openFileInTab]);

  const handleCreateNewFile = useCallback(async (fileName) => {
    if (typeof createFile !== 'function') return;
    const newFile = await createFile(fileName);
    if (newFile) {
      openFileInTab(newFile, '');
      toast.success(`Created ${newFile.name}`);
    }
  }, [createFile, openFileInTab]);

  const initialFileRequested = useRef(false);
  useEffect(() => {
    if (initialFileRequested.current || typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;
    initialFileRequested.current = true;
    invoke('get_initial_file')
      .then((path) => { if (path) handleOpenFile(path); })
      .catch((err) => console.warn('get_initial_file failed', err));
  }, [handleOpenFile]);

  useEffect(() => {
    let unlistenOpen = null;
    let unlistenDrop = null;
    let unlistenCli  = null;
    let isCancelled = false;
    let unlistenClose = null;

    const setupListeners = async () => {
      if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) {
        console.warn("Tauri internals not found, skipping listeners");
        return;
      }
      try {
        const openLoader = await listen('open-file', (event) => {
          if (event.payload) handleOpenFile(event.payload);
        });
        if (!isCancelled) unlistenOpen = openLoader;
        else openLoader();

        const dropLoader = await listen('tauri://drag-drop', (event) => {
          if (event.payload && event.payload.paths && event.payload.paths.length > 0) {
            event.payload.paths.forEach(path => handleOpenFile(path));
          }
        });
        if (!isCancelled) unlistenDrop = dropLoader;
        else dropLoader();

        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        const closeLoader = await appWindow.onCloseRequested(async (event) => {
          const hasUnsaved = unsavedChangesRef?.current || openFilesRef?.current?.some(f => f.unsaved);
          if (hasUnsaved) {
            event.preventDefault();
            const { ask } = await import('@tauri-apps/plugin-dialog');
            const answer = await ask('You have unsaved changes in one or more files. Are you sure you want to exit without saving?', {
              title: 'Unsaved Changes',
              kind: 'warning',
              okLabel: 'Exit without saving',
              cancelLabel: 'Cancel'
            });
            
            if (answer) {
              appWindow.destroy();
            }
          }
        });
        if (!isCancelled) unlistenClose = closeLoader;
        else closeLoader();

        const cliLoader = await listen('cli-command', (event) => {
          const cmd = event.payload;
          if (!cmd || !cmd.cmd) return;

          switch (cmd.cmd) {
            case 'open':
              if (cmd.path) handleOpenFile(cmd.path);
              break;
            case 'new': {
              const name = cmd.name || 'Untitled.md';
              handleCreateNewFile(name);
              toast.success(`CLI: created "${name}"`);
              break;
            }
            case 'pdf':
              if (cmd.path) {
                handleOpenFile(cmd.path);
                setTimeout(() => {
                  if (typeof setShowPrintModal === 'function') setShowPrintModal(true);
                }, 800);
              } else {
                if (typeof setShowPrintModal === 'function') setShowPrintModal(true);
              }
              break;
            case 'status':
              break;
            default:
              console.warn('Unknown CLI command:', cmd.cmd);
          }
        });
        if (!isCancelled) unlistenCli = cliLoader;
        else cliLoader();

      } catch (err) {
        console.error("Failed to setup Tauri listeners", err);
      }
    };

    setupListeners();

    const handleCustomEvent = (e) => handleOpenFile(e.detail);
    window.addEventListener('open-file', handleCustomEvent);

    return () => {
      isCancelled = true;
      if (unlistenOpen) unlistenOpen();
      if (unlistenDrop) unlistenDrop();
      if (unlistenCli)  unlistenCli();
      if (unlistenClose) unlistenClose();
      window.removeEventListener('open-file', handleCustomEvent);
    };

  }, [handleOpenFile, handleCreateNewFile, openFilesRef, unsavedChangesRef, setShowPrintModal]);

  const handleFileSelect = useCallback(async (fileObj) => {
    if (unsavedChangesRef?.current && currentFile && currentFile.path !== fileObj.path) {
      const isTauriRuntime = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
      if (!isTauriRuntime) {
        const discardChanges = window.confirm(
          `You have unsaved changes in ${currentFile.name || 'the current file'}.\n\nContinue without saving them?`
        );
        if (!discardChanges) return;
      } else {
        const answer = await ask(`You have unsaved changes in ${currentFile.name || 'the current file'}. Do you want to save them?`, {
          title: 'Unsaved Changes',
          kind: 'warning',
          okLabel: 'Save',
          cancelLabel: "Don't Save"
        });

        if (answer && (currentFile.handle || currentFile.path)) {
          try {
            const result = await saveFile(currentFile.handle, markdownRef.current, currentFile.lastModified, currentFile.path);
            if (result.success) {
              if (setLastSaved) setLastSaved(Date.now());
              if (setUnsavedChanges) setUnsavedChanges(false);
              if (unsavedChangesRef) unsavedChangesRef.current = false;

              const newTime = result.newLastModified;
              if (setCurrentFile) setCurrentFile(prev => ({ ...prev, lastModified: newTime }));
              if (setOpenFiles) {
                setOpenFiles(prev => prev.map(f => f.path === activeFileIdRef.current ? {
                  ...f,
                  unsaved: false,
                  content: markdownRef.current,
                  lastModified: newTime
                } : f));
              }
              toast.success('Saved before switching');
            } else {
              toast.error('Failed to save, switching anyway...');
            }
          } catch (e) {
            console.error(e);
            toast.error('Error saving file');
          }
        }
      }
    }

    try {
      const existing = openFilesRef?.current?.find(f => f.path === fileObj.path);
      if (existing) {
        switchTab(fileObj.path);
        return;
      }
      const freshRef = files.find(f => f.path === fileObj.path);
      const fileToOpen = freshRef ?? fileObj;

      let text = "";
      let lastMod = fileToOpen.lastModified || Date.now();

      if (fileToOpen.handle && typeof fileToOpen.handle.getFile === "function") {
        const file = await fileToOpen.handle.getFile();
        text = await file.text();
        lastMod = file.lastModified;
      } else if (fileToOpen.path) {
        if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
          text = await invoke("read_file", { path: fileToOpen.path });
          try {
            const modTime = await invoke("get_file_last_modified", { path: fileToOpen.path });
            if (modTime) lastMod = modTime;
          } catch {}
        } else {
          const response = await fetch("file:///" + fileToOpen.path.replace(/\\/g, "/"));
          if (!response.ok) throw new Error("Failed to load file");
          text = await response.text();
        }
      } else {
        throw new Error("No valid handle or path to read file");
      }

      openFileInTab({ ...fileToOpen, lastModified: lastMod }, text);
    } catch (err) {
      console.error(err);
      toast.error('Error reading file');
    }
  }, [currentFile, files, saveFile, switchTab, openFileInTab, openFilesRef, markdownRef, activeFileIdRef, unsavedChangesRef, setLastSaved, setUnsavedChanges, setCurrentFile, setOpenFiles]);

  return {
    handleOpenFile,
    handleCreateNewFile,
    handleFileSelect
  };
}
