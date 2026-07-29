import { useReducer, useCallback, useMemo } from 'react';
import { documentSessionReducer, initialDocumentState } from './documentSessionReducer';

export const useDocumentSession = (initialState = initialDocumentState) => {
  const [state, dispatch] = useReducer(documentSessionReducer, initialState);

  const openDocument = useCallback((fileObj) => {
    dispatch({ type: 'document/opened', payload: { fileObj } });
  }, []);

  const editDocument = useCallback((contentOrFn) => {
    dispatch({ type: 'document/edited', payload: { contentOrFn } });
  }, []);

  const markSaved = useCallback((path, lastModified, handle) => {
    dispatch({ type: 'document/saved', payload: { path, lastModified, handle } });
  }, []);

  const saveAsDocument = useCallback((fileObj) => {
    dispatch({ type: 'document/savedAs', payload: { fileObj } });
  }, []);

  const updateExternalChange = useCallback((path, content) => {
    dispatch({ type: 'document/changedExternally', payload: { path, content } });
  }, []);

  const activateTab = useCallback((path) => {
    dispatch({ type: 'tab/activated', payload: { path } });
  }, []);

  const reorderTabs = useCallback((newFiles) => {
    dispatch({ type: 'tab/reordered', payload: { newFiles } });
  }, []);

  const closeTab = useCallback((path) => {
    dispatch({ type: 'tab/closed', payload: { path } });
  }, []);

  const currentFile = useMemo(() => {
    return state.openFiles.find(f => f.path === state.activeFileId) || null;
  }, [state.openFiles, state.activeFileId]);

  const setUnsavedChanges = useCallback((unsaved = true) => {
    dispatch({ type: 'document/setUnsaved', payload: { unsaved } });
  }, []);

  return {
    openFiles: state.openFiles,
    activeFileId: state.activeFileId,
    currentFile,
    markdown: state.markdown,
    unsavedChanges: state.unsavedChanges,
    recentFiles: state.recentFiles,
    openDocument,
    editDocument,
    markSaved,
    saveAsDocument,
    updateExternalChange,
    activateTab,
    reorderTabs,
    closeTab,
    setUnsavedChanges,
    dispatch
  };
};
