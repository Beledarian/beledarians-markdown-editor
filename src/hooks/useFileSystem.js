import { useState, useCallback, useEffect } from 'react';
import { scanDirectory, loadIgnoreFile, saveIgnoreFile, createNewFile, deleteFile, renameFile } from '../utils/fileSystem';
import { saveDirectoryHandle, getDirectoryHandle } from '../utils/storage';
import { toast } from 'react-hot-toast';

export const useFileSystem = () => {
  const [dirHandle, setDirHandle] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [assets, setAssets] = useState([]);
  const [ignorePatterns, setIgnorePatterns] = useState(['node_modules', '.git', 'dist', 'build']);
  const [fsLoading, setFsLoading] = useState(false);
  const [savedHandle, setSavedHandle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const checkSaved = async () => {
      if (typeof indexedDB === 'undefined') return;
      try {
        const handle = await getDirectoryHandle();
        if (!cancelled && handle) setSavedHandle(handle);
      } catch (e) {
        console.error("Error checking saved handle", e);
      }
    };
    checkSaved();
    return () => { cancelled = true; };
  }, []);

  const refreshFileSystem = useCallback(async () => {
    if (!dirHandle) return;
    setFsLoading(true);
    try {
      const { mdFiles, assetFiles } = await scanDirectory(dirHandle, ignorePatterns);
      setFiles(mdFiles);
      setAssets(assetFiles);
    } catch (error) {
      console.error("Error scanning directory:", error);
      toast.error("Failed to refresh file system");
    } finally {
      setFsLoading(false);
    }
  }, [dirHandle, ignorePatterns]);

  const loadDirectory = useCallback(async (handle) => {
    setDirHandle(handle);
    setFsLoading(true);
    try {
      const loadedPatterns = await loadIgnoreFile(handle);
      setIgnorePatterns(loadedPatterns);

      const { mdFiles, assetFiles } = await scanDirectory(handle, loadedPatterns);
      setFiles(mdFiles);
      setAssets(assetFiles);
    } catch (error) {
      console.error("Error loading directory:", error);
      toast.error("Failed to load directory");
    } finally {
      setFsLoading(false);
    }
  }, []);

  const openFolder = useCallback(async () => {
    try {
      if (window.__TAURI_INTERNALS__) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const folderPath = await open({ directory: true, multiple: false });
        if (folderPath) {
          await loadDirectory(folderPath);
          await saveDirectoryHandle(folderPath);
          toast.success('Folder opened!');
          return true;
        }
        setFsLoading(false);
        return false;
      } else if (typeof window.showDirectoryPicker === 'function') {
        const handle = await window.showDirectoryPicker();
        await loadDirectory(handle);
        await saveDirectoryHandle(handle);
        toast.success('Folder opened!');
        return true;
      } else {
        toast.error('Local folder access is unsupported on this browser or platform.');
        setFsLoading(false);
        return false;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        toast.error('Failed to open folder.');
      }
      setFsLoading(false);
      return false;
    }
  }, [loadDirectory]);

  const restoreFolder = useCallback(async () => {
    if (!savedHandle) return false;

    try {
      if (typeof savedHandle === 'string') {
        // Tauri - we assume we still have permission to read the string path
        await loadDirectory(savedHandle);
        toast.success('Session restored!');
        return true;
      } else {
        let perm = await savedHandle.queryPermission({ mode: 'read' });
        if (perm !== 'granted') {
          perm = await savedHandle.requestPermission({ mode: 'read' });
        }

        if (perm === 'granted') {
          await loadDirectory(savedHandle);
          toast.success('Session restored!');
          return true;
        } else {
          toast('Permission needed to access folder.');
          return false;
        }
      }
    } catch (e) {
      console.error("Failed to restore", e);
      toast.error("Could not restore folder");
      return false;
    }
  }, [savedHandle, loadDirectory]);

  const addIgnorePattern = useCallback(async (pattern) => {
    const updated = [...ignorePatterns, pattern];
    setIgnorePatterns(updated);
    try {
      await saveIgnoreFile(updated, dirHandle);
      await refreshFileSystem();
    } catch (err) {
      console.error('Failed to update ignore patterns:', err);
      toast.error('Could not update ignore patterns');
    }
  }, [ignorePatterns, dirHandle, refreshFileSystem]);

  const removeIgnorePattern = useCallback(async (pattern) => {
    const updated = ignorePatterns.filter(p => p !== pattern);
    setIgnorePatterns(updated);
    try {
      await saveIgnoreFile(updated, dirHandle);
      await refreshFileSystem();
    } catch (err) {
      console.error('Failed to update ignore patterns:', err);
      toast.error('Could not update ignore patterns');
    }
  }, [ignorePatterns, dirHandle, refreshFileSystem]);

  const createFile = useCallback(async (fileName) => {
    if (!dirHandle) {
      toast.error('Please open a folder first');
      return null;
    }
    try {
      const newFile = await createNewFile(dirHandle, fileName);
      await refreshFileSystem();
      return newFile;
    } catch (err) {
      console.error('Failed to create file:', err);
      toast.error('Failed to create file: ' + err.message);
      return null;
    }
  }, [dirHandle, refreshFileSystem]);

  const saveFile = useCallback(async (fileHandle, content, expectedLastModified = null, filePath = null) => {
    if (!fileHandle && !filePath) return { success: false, error: 'No handle or path' };
    try {
      const isWritableWebHandle = Boolean(
        fileHandle
        && typeof fileHandle.getFile === 'function'
        && typeof fileHandle.createWritable === 'function'
      );
      const isTauriRuntime = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

      if (isWritableWebHandle) {
        // Web File System Access API. Prefer the handle even when the file also
        // has a display path; browser paths must never fall through to Tauri.
        if (expectedLastModified) {
          const fileOnDisk = await fileHandle.getFile();
          if (fileOnDisk.lastModified > expectedLastModified) {
            return {
              success: false,
              reason: 'conflict',
              currentLastModified: fileOnDisk.lastModified
            };
          }
        }

        const writable = await fileHandle.createWritable();
        try {
          await writable.write(content);
          await writable.close();
        } catch (err) {
          try { await writable.abort(); } catch { }
          throw err;
        }

        const newFile = await fileHandle.getFile();
        setFiles(prev => prev.map(f => {
          if (f.name === fileHandle.name) {
            return { ...f, lastModified: newFile.lastModified };
          }
          return f;
        }));

        return { success: true, newLastModified: newFile.lastModified };
      }

      if (filePath && isTauriRuntime) {
        // Native paths can originate from dialogs, file associations, drag/drop,
        // or the CLI. The app command applies one Markdown-only write policy to
        // all of them instead of relying on a dialog-added plugin-fs scope.
        const { invoke } = await import('@tauri-apps/api/core');
        if (expectedLastModified) {
          try {
            const diskModified = await invoke('get_file_last_modified', { path: filePath });
            if (diskModified > expectedLastModified) {
              return { success: false, reason: 'conflict', currentLastModified: diskModified };
            }
          } catch {}
        }
        await invoke('write_markdown_file', { path: filePath, content });

        let newLastModified = Date.now();
        try {
          newLastModified = await invoke('get_file_last_modified', { path: filePath });
        } catch {}

        const name = filePath.replace(/^.*[/\\]/, '');
        setFiles(prev => prev.map(f => {
          if (f.name === name) return { ...f, lastModified: newLastModified };
          return f;
        }));

        return { success: true, newLastModified };
      }

      return {
        success: false,
        reason: 'unsupported',
        error: 'This browser file does not provide direct write access'
      };
    } catch (e) {
      console.error("Save failed", e);
      return { success: false, error: e.message };
    }
  }, []);

  const handleDeleteFile = useCallback(async (fileName) => {
    if (!dirHandle) return false;
    try {
      await deleteFile(dirHandle, fileName);
      await refreshFileSystem();
      return true;
    } catch {
      toast.error("Failed to delete file");
      return false;
    }
  }, [dirHandle, refreshFileSystem]);

  const handleRenameFile = useCallback(async (oldName, newName) => {
    if (!dirHandle) return false;
    // Ensure .md extension
    let safeName = newName.trim();
    if (!safeName.toLowerCase().endsWith('.md')) safeName += '.md';
    try {
      await renameFile(dirHandle, oldName, safeName);
      await refreshFileSystem();
      return true;
    } catch (err) {
      toast.error('Failed to rename file: ' + (err.message || ''));
      throw err; // rethrow so Sidebar's submitRename can keep input open
    }
  }, [dirHandle, refreshFileSystem]);

  return {
    dirHandle,
    savedHandle,
    currentFile,
    setCurrentFile,
    files,
    assets,
    ignorePatterns,
    fsLoading,
    refreshFileSystem,
    openFolder,
    restoreFolder,
    addIgnorePattern,
    removeIgnorePattern,
    createFile,
    saveFile,
    deleteFile: handleDeleteFile,
    renameFile: handleRenameFile
  };
};
