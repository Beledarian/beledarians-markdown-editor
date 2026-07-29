import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import TabBar from './components/TabBar';
import FloatingFormatMenu from './components/FloatingFormatMenu';

import './App.css';
import './components/HighlightToolbar.css';

import WorkspaceOverlays from './components/WorkspaceOverlays';
import MarkdownWorkspace from './features/workspace/MarkdownWorkspace';
import { useDocumentSession } from './features/documents/useDocumentSession';
import { usePreferences } from './features/preferences/usePreferences';
import { useSearchAndReplace } from './hooks/useSearchAndReplace';
import { useFileDropHandler } from './hooks/useFileDropHandler';
import { useTauriMenuCommands } from './hooks/useTauriMenuCommands';
import { useFileSystem } from './hooks/useFileSystem';
import { useDebounce } from './hooks/useDebounce';
import { useOsEnv } from './hooks/useOsEnv';
import { useShortcuts } from './hooks/useShortcuts';
import { useEditorScroll } from './hooks/useEditorScroll';
import WorkspaceShell from './ui/WorkspaceShell.jsx';
import {
  ActivityRail,
  OutlineRail,
} from './components/WorkspaceFurniture.jsx';
import { templates } from './utils/templates';

import { useTabOperations } from './hooks/useTabOperations';
import { useAppFormatting } from './hooks/useAppFormatting';
import { useAppExport } from './hooks/useAppExport';
import { usePreviewInteractions } from './hooks/usePreviewInteractions';
import { useOutlineAndNavigation } from './hooks/useOutlineAndNavigation';
import { useTauriFileEvents } from './hooks/useTauriFileEvents';

const MARKDOWN_FILE_TYPES = [{
  description: 'Markdown documents',
  accept: {
    'text/markdown': ['.md', '.markdown'],
  },
}];

const normalizeMarkdownFileName = (name) => {
  const candidate = String(name || 'Untitled.md').trim() || 'Untitled.md';
  return /\.(md|markdown)$/i.test(candidate) ? candidate : `${candidate}.md`;
};

const createWebFileId = (file) => (
  `web-file:${file.name}:${file.lastModified || Date.now()}`
);

const shouldUseDesktopFilePicker = (picker) => (
  typeof picker === 'function'
  && typeof window !== 'undefined'
  && window.innerWidth > 600
);

function App() {
  // --- Persistence & Workspace Preference ---
  const { isMac } = useOsEnv();
  const isTauriRuntime =
    typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
  const isCapacitorRuntime =
    typeof window !== 'undefined' &&
    Boolean(window.Capacitor?.isNativePlatform?.());
  const workspacePlatform = isMac ? 'macos' : 'windows';

  const {
    preferences,
    setTheme,
    setCodeTheme,
    setWorkspaceStyle,
    setFontSize,
    setWordGoal,
    setShowMiniMap,
    setZenMode,
    setFocusMode,
    setTypewriterMode,
    setViewMode
  } = usePreferences();

  const { theme, codeTheme, workspaceStyle, fontSize, wordGoal, zenMode, focusMode, typewriterMode, showMiniMap, viewMode } = preferences;
  const colorMode = theme;
  const setColorMode = setTheme;

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Document Session
  const documentSession = useDocumentSession({
    openFiles: [{ name: 'Untitled', path: 'draft', storageKind: 'draft', content: typeof localStorage !== 'undefined' ? localStorage.getItem('md-draft') || '# Hello, world!' : '# Hello, world!', isDirty: false }],
    activeFileId: 'draft',
    markdown: typeof localStorage !== 'undefined' ? localStorage.getItem('md-draft') || '# Hello, world!' : '# Hello, world!',
    unsavedChanges: false,
    recentFiles: []
  });

  const {
    openFiles,
    activeFileId,
    currentFile,
    markdown,
    unsavedChanges,
    recentFiles,
    openDocument,
    editDocument: setMarkdown,
    saveAsDocument,
    activateTab,
    reorderTabs,
    closeTab,
    setUnsavedChanges
  } = documentSession;

  const setOpenFiles = reorderTabs;
  const setActiveFileId = activateTab;
  const switchTab = activateTab;

  const debouncedMarkdown = useDebounce(markdown, 150);

  const [contextMenu, setContextMenu] = useState(null);
  const [editorContextMenu, setEditorContextMenu] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('md-sidebar');
    if (saved) try { return JSON.parse(saved); } catch { localStorage.removeItem('md-sidebar'); }
    return true;
  });
  const [activeSection, setActiveSection] = useState('files');

  const [isVsCode, setIsVsCode] = useState(false);
  const openFilesRef = useRef(openFiles);
  useEffect(() => { openFilesRef.current = openFiles; }, [openFiles]);

  const markdownRef = useRef(markdown);
  const activeFileIdRef = useRef(activeFileId);
  const unsavedChangesRef = useRef(unsavedChanges);

  useEffect(() => { markdownRef.current = markdown; }, [markdown]);
  useEffect(() => { activeFileIdRef.current = activeFileId; }, [activeFileId]);
  useEffect(() => { unsavedChangesRef.current = unsavedChanges; }, [unsavedChanges]);
  useEffect(() => {
    localStorage.setItem('md-view-mode', viewMode);
  }, [viewMode]);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(() => Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [vimMode, setVimMode] = useState(() => localStorage.getItem('md-vim') === 'true');

  const [showThemeExplorer, setShowThemeExplorer] = useState(false);

  const {
    showGlobalSearch,
    setShowGlobalSearch,
    showFindReplace,
    setShowFindReplace,
    handleFind,
    handleHighlightFind,
    handleReplace,
    handleReplaceAll
  } = useSearchAndReplace(markdown, setMarkdown, viewMode);

  const [scrollSynced, setScrollSynced] = useState(() => {
    const saved = localStorage.getItem('md-scroll-synced');
    if (saved !== null) try { return JSON.parse(saved); } catch { localStorage.removeItem('md-scroll-synced'); }
    return true;
  });

  const [showMcpSetup, setShowMcpSetup] = useState(() => {
    return isTauriRuntime &&
      localStorage.getItem('md-mcp-setup-prompted') !== 'true';
  });

  const [imageSize, setImageSize] = useState(() => parseInt(localStorage.getItem('md-image-size') || '100'));
  const [imageAlignment, setImageAlignment] = useState(() => localStorage.getItem('md-image-align') || 'none');

  const {
    dirHandle,
    savedHandle,
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
    deleteFile,
    renameFile
  } = useFileSystem();

  useEffect(() => {
    setCodeTheme(prev => {
      if (colorMode === 'light' && prev === 'VS Code Dark') return 'VS Code Light';
      if (colorMode === 'dark' && prev === 'VS Code Light') return 'VS Code Dark';
      return prev;
    });
  }, [colorMode, setCodeTheme]);

  useEffect(() => { localStorage.setItem('md-codetheme', codeTheme); }, [codeTheme]);
  useEffect(() => { localStorage.setItem('md-sidebar', JSON.stringify(sidebarOpen)); }, [sidebarOpen]);
  useEffect(() => { localStorage.setItem('md-fontsize', fontSize.toString()); }, [fontSize]);
  useEffect(() => { localStorage.setItem('md-wordgoal', wordGoal.toString()); }, [wordGoal]);
  useEffect(() => { localStorage.setItem('md-vim', vimMode.toString()); }, [vimMode]);
  useEffect(() => { localStorage.setItem('md-minimap', JSON.stringify(showMiniMap)); }, [showMiniMap]);
  useEffect(() => { localStorage.setItem('md-image-size', imageSize.toString()); }, [imageSize]);
  useEffect(() => { localStorage.setItem('md-image-align', imageAlignment); }, [imageAlignment]);
  useEffect(() => { localStorage.setItem('md-scroll-synced', JSON.stringify(scrollSynced)); }, [scrollSynced]);

  const openFileInTab = useCallback((fileObj, content) => {
    openDocument({
      ...fileObj,
      content: content,
      lastModified: fileObj.lastModified || Date.now()
    });
    if (typeof setCurrentFile === 'function') {
      setCurrentFile(fileObj);
    }
  }, [openDocument, setCurrentFile]);

  const openBrowserFile = useCallback(async (file, handle = null) => {
    const text = await file.text();
    const fileObj = {
      name: file.name,
      path: createWebFileId(file),
      handle,
      storageKind: handle ? 'web-handle' : 'web-import',
      lastModified: file.lastModified || Date.now(),
    };
    openFileInTab(fileObj, text);
    toast.success(`Opened ${file.name}`);
    return fileObj;
  }, [openFileInTab]);

  const downloadMarkdownCopy = useCallback((content, requestedName) => {
    const fileName = normalizeMarkdownFileName(requestedName);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success(`Downloaded ${fileName}`);
    return fileName;
  }, []);

  // Draft persistence
  useEffect(() => {
    if (activeFileId !== 'draft') return;
    const timer = setTimeout(() => {
      localStorage.setItem('md-draft', markdown);
    }, 300);

    const handleBeforeUnload = () => {
      localStorage.setItem('md-draft', markdownRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [markdown, activeFileId]);

  useEffect(() => {
    return () => {
      if (activeFileIdRef.current === 'draft') {
        localStorage.setItem('md-draft', markdownRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (dirHandle) {
      setSidebarOpen(true);
    }
  }, [dirHandle]);

  // Hook 1: Export
  const {
    showPrintModal,
    setShowPrintModal,
    handleExportHTML,
    handleExportPDF,
    copyToClipboard,
    handleCopyHTML
  } = useAppExport({ markdown, theme });

  // Hook 2: Tauri File Events
  const {
    handleOpenFile,
    handleCreateNewFile,
    handleFileSelect
  } = useTauriFileEvents({
    openFileInTab,
    createFile,
    currentFile,
    files,
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
  });

  // Hook 3: Formatting
  const {
    floatingMenu,
    setFloatingMenu,
    lastFormat,
    insertTextAtCursor,
    applyFormat,
    handleApplyLastFormat,
    handleFormatSyntax,
    handleOpenFormatMenu,
    handleColorChange,
    handleHighlight,
    handleInsertTimestamp,
    handleInsertTemplate
  } = useAppFormatting({
    markdown,
    setMarkdown,
    setUnsavedChanges,
    contextMenu,
    setContextMenu
  });

  // Hook 4: Tab Operations
  const {
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleDuplicateTab,
    handleCopyTabPath,
    handleTabReorder,
    handleFileDropOnTab
  } = useTabOperations({
    openFiles,
    setOpenFiles,
    activeFileId,
    setActiveFileId,
    switchTab,
    files,
    assets,
    setMarkdown,
    setUnsavedChanges,
    setCurrentFile,
    setLastSaved
  });

  // Hook 5: Preview Interactions
  const {
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    components
  } = usePreviewInteractions({
    markdownRef,
    setMarkdown,
    setUnsavedChanges,
    contextMenu,
    setContextMenu,
    setEditorContextMenu,
    files,
    handleFileSelect,
    assets,
    currentFile,
    dirHandle,
    imageSize,
    imageAlignment,
    codeTheme
  });

  // Hook 6: Outline & Navigation
  const {
    headings,
    scrollToLine,
    handleNavigate
  } = useOutlineAndNavigation({ markdown, debouncedMarkdown });

  // VS Code Integration
  useEffect(() => {
    if (window.vscode) {
      setIsVsCode(true);
      setSidebarOpen(false);

      const handleVsCodeUpdate = (event) => {
        const newText = event.detail;
        setMarkdown(prev => (prev !== newText ? newText : prev));
      };

      window.addEventListener('vscode-update', handleVsCodeUpdate);
      return () => {
        window.removeEventListener('vscode-update', handleVsCodeUpdate);
      };
    }
  }, [setMarkdown]);

  useEffect(() => {
    if (isVsCode && window.vscode) {
      window.vscode.postMessage({
        type: 'update',
        text: markdown
      });
    }
  }, [markdown, isVsCode]);

  useEditorScroll(activeFileId, scrollSynced);

  // Auto-save logic
  useEffect(() => {
    if (isVsCode) return;
    const hasWritableWebHandle = Boolean(
      currentFile?.handle && typeof currentFile.handle.createWritable === 'function'
    );
    const hasNativePath = Boolean(
      isTauriRuntime && currentFile?.path && currentFile.storageKind !== 'draft'
    );
    if (!autoSaveEnabled || !currentFile || (!hasWritableWebHandle && !hasNativePath) || !unsavedChangesRef.current) return;

    const savedFileId = currentFile.path;
    const savedMarkdown = markdown;

    const timer = setTimeout(async () => {
      if (!unsavedChangesRef.current) return;
      if (Date.now() - lastSaved > 2000) {
        setIsSaving(true);
        const result = await saveFile(
          hasWritableWebHandle ? currentFile.handle : null,
          savedMarkdown,
          currentFile.lastModified,
          hasNativePath ? savedFileId : null
        );

        if (result.success) {
          setLastSaved(Date.now());
          const newTime = result.newLastModified;
          setOpenFiles(prev => prev.map(f => f.path === savedFileId ? {
            ...f,
            unsaved: false,
            content: savedMarkdown,
            lastModified: newTime,
            lastSaveKind: 'disk',
          } : f));
          if (activeFileIdRef.current === savedFileId) {
            setUnsavedChanges(false);
            setCurrentFile(prev => (prev && prev.path === savedFileId ? { ...prev, lastModified: newTime } : prev));
          }
        } else if (result.reason === 'conflict') {
          console.warn("Auto-save paused due to external change");
          toast.error("Auto-save paused: External change detected", { id: 'autosave-conflict' });
        }
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [markdown, autoSaveEnabled, currentFile, lastSaved, saveFile, activeFileId, isVsCode, isTauriRuntime, setCurrentFile, setOpenFiles, setUnsavedChanges]);

  // File Watcher
  useEffect(() => {
    if (!currentFile || isVsCode) return;

    const checkFileStatus = async () => {
      if (isSaving || Date.now() - lastSaved < 1000) return;
      try {
        let diskModified = 0;
        let hasChanged = false;

        if (currentFile.handle && typeof currentFile.handle.getFile === "function") {
          try {
            const fileOnDisk = await currentFile.handle.getFile();
            diskModified = fileOnDisk.lastModified;
          } catch { return; }
        } else if (currentFile.path && isTauriRuntime) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            diskModified = await invoke('get_file_last_modified', { path: currentFile.path });
          } catch { return; }
        }

        if (diskModified > currentFile.lastModified) {
          hasChanged = true;
        }

        if (hasChanged) {
          if (!unsavedChanges) {
            let content = '';
            if (currentFile.handle) {
              const file = await currentFile.handle.getFile();
              content = await file.text();
            } else if (isTauriRuntime) {
              const { invoke } = await import('@tauri-apps/api/core');
              content = await invoke('read_file', { path: currentFile.path });
            } else {
              return;
            }

            if (content !== markdownRef.current) {
              setMarkdown(content);
              const newTime = diskModified;
              setCurrentFile(prev => ({ ...prev, lastModified: newTime }));
              setOpenFiles(prev => prev.map(f => f.path === activeFileId ? {
                ...f,
                content: content,
                lastModified: newTime,
                unsaved: false
              } : f));

              toast.success('File reloaded from disk', { id: 'autoreload' });
            } else {
              setCurrentFile(prev => ({ ...prev, lastModified: diskModified }));
            }
          } else {
            toast('External changes detected. Save to resolve.', {
              id: 'conflict-warning',
              duration: 4000
            });
          }
        }
      } catch (e) {
        console.error("File watch error", e);
      }
    };

    const interval = setInterval(checkFileStatus, 2000);
    return () => clearInterval(interval);
  }, [currentFile, unsavedChanges, activeFileId, isVsCode, isTauriRuntime, setCurrentFile, isSaving, lastSaved, setMarkdown, setOpenFiles]);

  const markCurrentFileSaved = useCallback((savedContent, newLastModified, patch = { lastSaveKind: 'disk' }) => {
    const savedFileId = activeFileIdRef.current;
    setLastSaved(Date.now());
    setUnsavedChanges(false);
    setCurrentFile(prev => (
      prev && prev.path === savedFileId
        ? { ...prev, ...patch, lastModified: newLastModified }
        : prev
    ));
    setOpenFiles(prev => prev.map(file => (
      file.path === savedFileId
        ? {
            ...file,
            ...patch,
            content: savedContent,
            isDirty: false,
            unsaved: false,
            lastModified: newLastModified,
          }
        : file
    )));
  }, [setCurrentFile, setOpenFiles, setUnsavedChanges]);

  const saveNativeDocumentAs = useCallback(async () => {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const filePath = await save({
      defaultPath: normalizeMarkdownFileName(currentFile?.name || 'Untitled.md'),
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
    });
    if (!filePath) {
      toast('Save cancelled');
      return false;
    }

    const result = await saveFile(null, markdown, null, filePath);
    if (!result?.success) {
      toast.error(`Failed to save: ${result?.error || 'Unknown error'}`);
      return false;
    }

    const savedName = filePath.replace(/^.*[/\\]/, '');
    const savedFile = {
      ...currentFile,
      name: savedName,
      path: filePath,
      handle: null,
      storageKind: 'native-path',
      content: markdown,
      lastModified: result.newLastModified,
      lastSaveKind: 'disk',
      isDirty: false,
      unsaved: false,
    };
    saveAsDocument(savedFile);
    setCurrentFile(savedFile);
    setLastSaved(Date.now());
    toast.success(`Saved ${savedName}`);
    return true;
  }, [currentFile, markdown, saveAsDocument, saveFile, setCurrentFile]);

  const saveCapacitorDocument = useCallback(async ({ share = false } = {}) => {
    try {
      const [
        { Filesystem, Directory, Encoding },
        { Share },
      ] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ]);
      const savedName = normalizeMarkdownFileName(currentFile?.name || 'Untitled.md');
      const storagePath =
        currentFile?.storageKind === 'capacitor-file' && currentFile.storagePath
          ? currentFile.storagePath
          : `Beledarians Markdown Editor/${savedName}`;

      await Filesystem.writeFile({
        path: storagePath,
        data: markdown,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      if (share) {
        const { uri } = await Filesystem.getUri({
          path: storagePath,
          directory: Directory.Documents,
        });
        await Share.share({
          title: savedName,
          text: 'Markdown document',
          url: uri,
          dialogTitle: 'Save or share Markdown file',
        });
      }

      const savedFile = {
        ...currentFile,
        name: savedName,
        path: `capacitor:${storagePath}`,
        handle: null,
        storageKind: 'capacitor-file',
        storagePath,
        content: markdown,
        lastModified: Date.now(),
        lastSaveKind: 'disk',
        isDirty: false,
        unsaved: false,
      };
      saveAsDocument(savedFile);
      setCurrentFile(savedFile);
      setLastSaved(Date.now());
      toast.success(`Saved ${savedName} on this device`);
      return true;
    } catch (error) {
      console.error('Phone save failed', error);
      toast.error(`Could not save file: ${error?.message || 'Unknown error'}`);
      return false;
    }
  }, [currentFile, markdown, saveAsDocument, setCurrentFile]);

  const saveWebDocumentAs = useCallback(async () => {
    const suggestedName = normalizeMarkdownFileName(currentFile?.name || 'Untitled.md');

    if (shouldUseDesktopFilePicker(window.showSaveFilePicker)) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: MARKDOWN_FILE_TYPES,
        });
        const result = await saveFile(handle, markdown, null, null);
        if (!result.success) {
          toast.error(`Failed to save: ${result.error || 'Unknown error'}`);
          return false;
        }

        const file = await handle.getFile();
        const oldPath = activeFileIdRef.current;
        const newPath = createWebFileId(file);
        const nextFile = {
          name: file.name,
          path: newPath,
          handle,
          storageKind: 'web-handle',
          content: markdown,
          lastModified: result.newLastModified,
          lastSaveKind: 'disk',
          isDirty: false,
          unsaved: false,
        };

        setOpenFiles(prev => prev.map(openFile => (
          openFile.path === oldPath ? nextFile : openFile
        )));
        setActiveFileId(newPath);
        setCurrentFile(nextFile);
        setLastSaved(Date.now());
        setUnsavedChanges(false);
        toast.success(`Saved ${file.name}`);
        return true;
      } catch (error) {
        if (error?.name === 'AbortError') {
          toast('Save cancelled');
          return false;
        }
        console.error('Browser save picker failed', error);
        toast.error(`Could not save file: ${error?.message || 'Unknown error'}`);
        return false;
      }
    }

    downloadMarkdownCopy(markdown, suggestedName);
    markCurrentFileSaved(markdown, Date.now(), { lastSaveKind: 'download' });
    return true;
  }, [currentFile, downloadMarkdownCopy, markdown, markCurrentFileSaved, saveFile, setActiveFileId, setCurrentFile, setOpenFiles, setUnsavedChanges]);

  const handleSaveFile = useCallback(async () => {
    if (isVsCode) {
      toast('Use Ctrl+S in VS Code to save');
      return;
    }

    if (isCapacitorRuntime) {
      await saveCapacitorDocument();
      return;
    }

    const hasWritableWebHandle = Boolean(
      currentFile?.handle && typeof currentFile.handle.createWritable === 'function'
    );
    const hasNativePath = Boolean(
      isTauriRuntime && currentFile?.path && currentFile.storageKind !== 'draft'
    );

    if (currentFile && (hasWritableWebHandle || hasNativePath)) {
      const result = await saveFile(
        hasWritableWebHandle ? currentFile.handle : null,
        markdown,
        currentFile.lastModified,
        hasNativePath ? currentFile.path : null
      );

      if (result.success) {
        toast.success(`Saved ${currentFile.name || 'file'}`);
        markCurrentFileSaved(markdown, result.newLastModified);
      } else if (result.reason === 'conflict') {
        const confirmOverwrite = await window.confirm(
          'File has been modified on disk since you opened it.\n\nOverwrite with your changes?'
        );
        if (confirmOverwrite) {
          const forceResult = await saveFile(
            hasWritableWebHandle ? currentFile.handle : null,
            markdown,
            null,
            hasNativePath ? currentFile.path : null
          );
          if (forceResult.success) {
            toast.success(`Saved ${currentFile.name || 'file'} (overwritten)`);
            markCurrentFileSaved(markdown, forceResult.newLastModified);
          } else {
            toast.error('Failed to overwrite: ' + forceResult.error);
          }
        } else {
          toast('Save cancelled');
        }
      } else {
        toast.error('Failed to save: ' + result.error);
      }
      return;
    }

    if (isTauriRuntime) {
      await saveNativeDocumentAs();
      return;
    }

    await saveWebDocumentAs();
  }, [currentFile, isCapacitorRuntime, isTauriRuntime, isVsCode, markdown, markCurrentFileSaved, saveCapacitorDocument, saveFile, saveNativeDocumentAs, saveWebDocumentAs]);

  const { isDraggingOver } = useFileDropHandler({
    dirHandle,
    refreshFileSystem,
    insertTextAtCursor,
    openFileInTab
  });

  const handleNewDoc = useCallback(() => {
    const newId = `draft-${Date.now()}`;
    openDocument({
      name: 'Untitled.md',
      path: newId,
      handle: null,
      storageKind: 'draft',
      content: '',
      lastModified: Date.now()
    });
    if (typeof setCurrentFile === 'function') {
      setCurrentFile({ name: 'Untitled.md', path: newId, handle: null, storageKind: 'draft', lastModified: Date.now() });
    }
  }, [openDocument, setCurrentFile]);

  const handleOpenDoc = useCallback(async () => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
      });
      if (selected) {
        await handleOpenFile(selected);
      }
      return;
    }

    if (shouldUseDesktopFilePicker(window.showOpenFilePicker)) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: MARKDOWN_FILE_TYPES,
        });
        if (!handle) return;
        const file = await handle.getFile();
        await openBrowserFile(file, handle);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Browser file picker failed', error);
          toast.error(`Could not open file: ${error?.message || 'Unknown error'}`);
        }
      }
      return;
    }

    document.getElementById('file-input')?.click();
  }, [handleOpenFile, openBrowserFile]);

  const handleSaveAs = useCallback(async () => {
    if (isCapacitorRuntime) {
      await saveCapacitorDocument({ share: true });
      return;
    }

    if (isTauriRuntime) {
      await saveNativeDocumentAs();
      return;
    }

    await saveWebDocumentAs();
  }, [isCapacitorRuntime, isTauriRuntime, saveCapacitorDocument, saveNativeDocumentAs, saveWebDocumentAs]);

  const handlers = useMemo(() => ({
    newDoc: handleNewDoc,
    openDoc: handleOpenDoc,
    save: handleSaveFile,
    saveAs: handleSaveAs,
    sidebar: () => setSidebarOpen(prev => !prev),
    theme: toggleTheme,
    html: handleExportHTML,
    print: handleExportPDF,
    copyAll: copyToClipboard,
    settings: () => setShowSettings(prev => !prev),
    zen: () => setZenMode(prev => !prev),
    focusMode: () => setFocusMode(prev => !prev),
    zoomIn: () => setFontSize(prev => Math.min(prev + 2, 32)),
    zoomOut: () => setFontSize(prev => Math.max(prev - 2, 10)),
    resetZoom: () => setFontSize(16),
    timestamp: handleInsertTimestamp,
    cheatsheet: () => setShowCheatSheet(prev => !prev),
    applyLastFormat: handleApplyLastFormat,
    openFormatMenu: () => handleOpenFormatMenu('highlight'),
    openColorMenu: () => handleOpenFormatMenu('color'),
    findReplace: () => {
      setShowGlobalSearch(false);
      setShowFindReplace(prev => !prev);
    },
    globalSearch: () => {
      setShowFindReplace(false);
      setShowGlobalSearch(prev => !prev);
    },
    mcpSetup: () => {
      if (isTauriRuntime) setShowMcpSetup(prev => !prev);
    }
  }), [handleNewDoc, handleOpenDoc, handleSaveFile, handleSaveAs, handleExportHTML, handleExportPDF, copyToClipboard, toggleTheme, handleInsertTimestamp, handleApplyLastFormat, handleOpenFormatMenu, setSidebarOpen, setZenMode, setFocusMode, setFontSize, setShowSettings, setShowCheatSheet, setShowFindReplace, setShowGlobalSearch, setShowMcpSetup, isTauriRuntime]);

  const { shortcuts, updateShortcut } = useShortcuts(handlers);

  useTauriMenuCommands({
    handleNewDoc,
    handleOpenDoc,
    handleSaveFile,
    handleSaveAs,
    handleExportPDF,
    handleExportHTML,
    setSidebarOpen,
    setShowMiniMap
  });

  const handleFileLoad = useCallback(async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      await openBrowserFile(file);
    } catch (error) {
      console.error('Failed to import Markdown file', error);
      toast.error(`Could not open ${file.name}`);
    } finally {
      input.value = '';
    }
  }, [openBrowserFile]);

  const wordCount = markdown.trim().split(/\s+/).filter(w => w).length;
  const charCount = markdown.length;
  const lineCount = markdown.split(/\n/).length;
  const readingTime = Math.ceil(wordCount / 200);

  const commandRegion = (
    <Toolbar
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      savedHandle={savedHandle}
      dirHandle={dirHandle}
      handleRestoreFolder={restoreFolder}
      handleOpenFile={handleOpenDoc}
      handleSaveFile={handleSaveFile}
      handleSaveAs={handleSaveAs}
      handleExportHTML={handleExportHTML}
      handleExportPDF={handleExportPDF}
      copyToClipboard={copyToClipboard}
      handleColorChange={handleColorChange}
      handleHighlight={handleHighlight}
      onFormatSyntax={handleFormatSyntax}
      theme={colorMode}
      toggleTheme={toggleTheme}
      workspaceStyle={workspaceStyle}
      setWorkspaceStyle={setWorkspaceStyle}
      setShowSettings={setShowSettings}
      setShowCheatSheet={setShowCheatSheet}
      setShowMcpSetup={setShowMcpSetup}
      showMcpSetupControl={isTauriRuntime}
      zenMode={zenMode}
      setZenMode={setZenMode}
      focusMode={focusMode}
      setFocusMode={setFocusMode}
      fontSize={fontSize}
      setFontSize={setFontSize}
      autoSaveEnabled={autoSaveEnabled}
      setAutoSaveEnabled={setAutoSaveEnabled}
      shortcuts={shortcuts}
      onFileLoad={handleFileLoad}
      handleCopyHTML={handleCopyHTML}
      handleInsertTemplate={handleInsertTemplate}
      templates={templates}
      typewriterMode={typewriterMode}
      setTypewriterMode={setTypewriterMode}
      vimMode={vimMode}
      setVimMode={setVimMode}
      showMiniMap={showMiniMap}
      setShowMiniMap={setShowMiniMap}
      scrollSynced={scrollSynced}
      setScrollSynced={setScrollSynced}
      viewMode={viewMode}
      setViewMode={setViewMode}
      workspaceName={dirHandle?.name || savedHandle?.name}
      currentFile={currentFile || openFiles.find(file => file.path === activeFileId)}
    />
  );

  const tabsRegion = openFiles.length > 0 ? (
    <TabBar
      tabs={openFiles}
      activeTabId={activeFileId}
      onTabClick={switchTab}
      onTabClose={closeTab}
      onTabReorder={handleTabReorder}
      onFileDrop={handleFileDropOnTab}
      onCloseOthers={handleCloseOtherTabs}
      onCloseToRight={handleCloseTabsToRight}
      onDuplicateTab={handleDuplicateTab}
      onCopyPath={handleCopyTabPath}
    />
  ) : null;

  const navigatorRegion = sidebarOpen ? (
    <Sidebar
      files={files}
      assets={assets}
      loading={fsLoading}
      ignorePatterns={ignorePatterns}
      currentFile={currentFile}
      onFileSelect={handleFileSelect}
      onInsertImage={insertTextAtCursor}
      onRefresh={refreshFileSystem}
      onAddIgnore={addIgnorePattern}
      onRemoveIgnore={removeIgnorePattern}
      onOpenFolder={openFolder}
      onCreateNewFile={handleCreateNewFile}
      onOpenThemeExplorer={() => setShowThemeExplorer(true)}
      onDeleteFile={deleteFile}
      onRenameFile={renameFile}
      hasFolderOpen={!!dirHandle}
      headings={headings}
      onHeadingClick={scrollToLine}
      onOpenGlobalSearch={() => {
        setShowFindReplace(false);
        setShowGlobalSearch(true);
      }}
      onOpenFileExternal={handleOpenDoc}
      activeSection={activeSection}
      onActiveSectionChange={setActiveSection}
    />
  ) : null;

  const activityRegion = (
    <ActivityRail
      activeSection={activeSection}
      onSectionChange={(section) => {
        setActiveSection(section);
        setSidebarOpen(true);
      }}
      onSearch={() => {
        setShowFindReplace(false);
        setShowGlobalSearch(true);
      }}
      onExport={() => setShowPrintModal(true)}
      onThemes={() => setShowThemeExplorer(true)}
      onSettings={() => setShowSettings(true)}
    />
  );

  const outlineRegion = workspaceStyle === 'reading' ? (
    <OutlineRail headings={headings} onHeadingClick={scrollToLine} />
  ) : null;

  const statusRegion = (
    <StatusBar
      currentFile={currentFile}
      unsavedChanges={unsavedChanges}
      isSaving={isSaving}
      lineCount={lineCount}
      wordCount={wordCount}
      wordGoal={wordGoal}
      onSetWordGoal={setWordGoal}
      charCount={charCount}
      readingTime={readingTime}
      handleInsertTimestamp={handleInsertTimestamp}
      shortcuts={shortcuts}
    />
  );

  const workspaceModeClassName = [
    zenMode && 'zen-mode',
    focusMode && 'focus-mode',
    typewriterMode && 'typewriter-mode',
    `view-${viewMode}`
  ].filter(Boolean).join(' ');

  return (
    <WorkspaceShell
      workspaceStyle={workspaceStyle}
      colorMode={colorMode}
      platform={workspacePlatform}
      viewMode={viewMode}
      className={workspaceModeClassName}
      commandRegion={commandRegion}
      activityRegion={activityRegion}
      navigatorRegion={navigatorRegion}
      tabsRegion={tabsRegion}
      outlineRegion={outlineRegion}
      statusRegion={statusRegion}
    >
      <div className={`app ${workspaceModeClassName}`} data-color-mode={theme} data-theme={theme}>
      <Toaster />
      {floatingMenu && (
        <FloatingFormatMenu
          position={floatingMenu}
          onClose={() => setFloatingMenu(null)}
          onApply={applyFormat}
          initialColor={lastFormat.color}
          initialOpacity={lastFormat.opacity}
          type={floatingMenu.type}
        />
      )}
      <MarkdownWorkspace
        openFiles={openFiles}
        markdown={markdown}
        debouncedMarkdown={debouncedMarkdown}
        viewMode={viewMode}
        fontSize={fontSize}
        zenMode={zenMode}
        showMiniMap={showMiniMap}
        components={components}
        isDraggingOver={isDraggingOver}
        handleDrop={(e) => { e.preventDefault(); }}
        handleDragOver={(e) => { e.preventDefault(); }}
        handleCursorActivity={() => {}}
        setMarkdown={setMarkdown}
        setUnsavedChanges={setUnsavedChanges}
        openFolder={openFolder}
        handleCreateNewFile={handleCreateNewFile}
        recentFiles={recentFiles}
        handleFileSelect={handleFileSelect}
      />
      <WorkspaceOverlays
        showMcpSetup={isTauriRuntime && showMcpSetup}
        setShowMcpSetup={setShowMcpSetup}
        showThemeExplorer={showThemeExplorer}
        setShowThemeExplorer={setShowThemeExplorer}
        theme={theme}
        setColorMode={setColorMode}
        codeTheme={codeTheme}
        setCodeTheme={setCodeTheme}
        shortcuts={shortcuts}
        onUpdateShortcut={updateShortcut}
        imageSize={imageSize}
        setImageSize={setImageSize}
        imageAlignment={imageAlignment}
        setImageAlignment={setImageAlignment}
        workspaceStyle={workspaceStyle}
        setWorkspaceStyle={setWorkspaceStyle}
        showGlobalSearch={showGlobalSearch}
        setShowGlobalSearch={setShowGlobalSearch}
        files={files}
        handleFileSelect={handleFileSelect}
        handleNavigate={handleNavigate}
        showFindReplace={showFindReplace}
        setShowFindReplace={setShowFindReplace}
        markdown={markdown}
        handleFind={handleFind}
        handleHighlightFind={handleHighlightFind}
        handleReplace={handleReplace}
        handleReplaceAll={handleReplaceAll}
        setMarkdown={setMarkdown}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        fontSize={fontSize}
        setFontSize={setFontSize}
        wordGoal={wordGoal}
        setWordGoal={setWordGoal}
        showCheatSheet={showCheatSheet}
        setShowCheatSheet={setShowCheatSheet}
        showPrintModal={showPrintModal}
        setShowPrintModal={setShowPrintModal}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        handleSaveFile={saveFile}
        handleOpenFolder={openFolder}
        handleCloseTab={closeTab}
        handleInsertComment={handleAddComment}
        handleEditComment={handleEditComment}
        handleDeleteComment={handleDeleteComment}
        editorContextMenu={editorContextMenu}
        setEditorContextMenu={setEditorContextMenu}
        insertTextAtCursor={insertTextAtCursor}
      />
      </div>
    </WorkspaceShell>
  );
}

export default App;
