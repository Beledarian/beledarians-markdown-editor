export const initialDocumentState = {
  openFiles: [],
  activeFileId: null,
  markdown: '',
  unsavedChanges: false,
  recentFiles: []
};

export const documentSessionReducer = (state, action) => {
  switch (action.type) {
    case 'document/opened': {
      const { fileObj } = action.payload;
      if (!fileObj || !fileObj.path) return state;

      const isDirty = !!fileObj.unsaved || !!fileObj.isDirty;
      const exists = state.openFiles.some(f => f.path === fileObj.path);
      const newOpenFiles = exists
        ? state.openFiles.map(f => {
            if (f.path !== fileObj.path) return f;
            if (f.isDirty) return f;
            return { ...f, ...fileObj, isDirty, unsaved: f.path === state.activeFileId ? false : isDirty };
          })
        : [...state.openFiles.map(f => f.path === state.activeFileId ? { ...f, unsaved: f.isDirty } : f), { ...fileObj, isDirty, unsaved: false }];

      const newRecent = [
        fileObj,
        ...state.recentFiles.filter(f => f.path !== fileObj.path)
      ].slice(0, 10);

      const activeFile = newOpenFiles.find(f => f.path === fileObj.path);

      return {
        ...state,
        openFiles: newOpenFiles,
        activeFileId: fileObj.path,
        markdown: activeFile ? activeFile.content : (fileObj.content || ''),
        unsavedChanges: activeFile ? !!activeFile.isDirty : false,
        recentFiles: newRecent
      };
    }

    case 'document/edited': {
      const rawContent = action.payload?.contentOrFn ?? action.payload?.content ?? action.payload;
      const content = typeof rawContent === 'function' ? rawContent(state.markdown) : rawContent;
      const newOpenFiles = state.openFiles.map(f =>
        f.path === state.activeFileId ? { ...f, content, isDirty: true } : f
      );
      return {
        ...state,
        markdown: content,
        unsavedChanges: true,
        openFiles: newOpenFiles
      };
    }

    case 'document/saved': {
      const { path, lastModified, handle } = action.payload || {};
      const targetPath = path || state.activeFileId;
      const newOpenFiles = state.openFiles.map(f =>
        f.path === targetPath
          ? { ...f, isDirty: false, unsaved: false, lastModified: lastModified || Date.now(), handle: handle || f.handle }
          : f
      );
      const activeFile = newOpenFiles.find(f => f.path === state.activeFileId);
      return {
        ...state,
        unsavedChanges: activeFile ? !!activeFile.isDirty : false,
        openFiles: newOpenFiles
      };
    }

    case 'document/savedAs': {
      const { fileObj } = action.payload || {};
      if (!fileObj?.path || !state.activeFileId) return state;

      const previousPath = state.activeFileId;
      const savedFile = {
        ...fileObj,
        content: fileObj.content ?? state.markdown,
        isDirty: false,
        unsaved: false
      };
      const newOpenFiles = state.openFiles
        .filter(file => file.path !== savedFile.path || file.path === previousPath)
        .map(file => file.path === previousPath ? savedFile : file);

      return {
        ...state,
        openFiles: newOpenFiles,
        activeFileId: savedFile.path,
        markdown: savedFile.content,
        unsavedChanges: false,
        recentFiles: [
          savedFile,
          ...state.recentFiles.filter(file => file.path !== savedFile.path)
        ].slice(0, 10)
      };
    }

    case 'document/changedExternally': {
      const { path, content } = action.payload;
      const targetFile = state.openFiles.find(f => f.path === path);
      const isTargetDirty = targetFile ? !!targetFile.isDirty : false;
      const newOpenFiles = state.openFiles.map(f =>
        f.path === path
          ? { ...f, content: isTargetDirty ? f.content : content, lastModified: Date.now() }
          : f
      );
      const activeFile = newOpenFiles.find(f => f.path === state.activeFileId);

      return {
        ...state,
        markdown: state.activeFileId === path && !isTargetDirty ? content : state.markdown,
        unsavedChanges: activeFile ? !!activeFile.isDirty : false,
        openFiles: newOpenFiles
      };
    }

    case 'tab/activated': {
      const { path } = action.payload;
      const file = state.openFiles.find(f => f.path === path);
      if (!file) return state;

      const newOpenFiles = state.openFiles.map(f => ({
        ...f,
        unsaved: f.isDirty
      }));

      return {
        ...state,
        openFiles: newOpenFiles,
        activeFileId: path,
        markdown: file.content || '',
        unsavedChanges: !!file.isDirty
      };
    }

    case 'tab/reordered': {
      const raw = action.payload?.newOpenFiles ?? action.payload?.newFiles ?? action.payload;
      const newOpenFiles = typeof raw === 'function' ? raw(state.openFiles) : raw;
      if (!Array.isArray(newOpenFiles)) return state;
      const activeFile = newOpenFiles.find(f => f.path === state.activeFileId);

      return {
        ...state,
        openFiles: newOpenFiles,
        unsavedChanges: activeFile ? !!activeFile.isDirty : false
      };
    }

    case 'document/setUnsaved': {
      const isUnsaved = action.payload?.unsaved ?? action.payload ?? true;
      const newOpenFiles = state.openFiles.map(f =>
        f.path === state.activeFileId ? { ...f, isDirty: isUnsaved, unsaved: isUnsaved } : f
      );
      return {
        ...state,
        unsavedChanges: isUnsaved,
        openFiles: newOpenFiles
      };
    }

    case 'tab/closed': {
      const { path } = action.payload;
      const closingIndex = state.openFiles.findIndex(f => f.path === path);
      if (closingIndex === -1) return state;

      const newOpenFiles = state.openFiles.filter(f => f.path !== path);

      if (newOpenFiles.length === 0) {
        return {
          ...state,
          openFiles: [{ name: 'Untitled', path: 'draft', storageKind: 'draft', content: '# Hello, world!', isDirty: false }],
          activeFileId: 'draft',
          markdown: '# Hello, world!',
          unsavedChanges: false
        };
      }

      let newActiveFileId = state.activeFileId;
      if (state.activeFileId === path) {
        const nextActive = newOpenFiles[Math.min(closingIndex, newOpenFiles.length - 1)];
        newActiveFileId = nextActive ? nextActive.path : null;
      }

      const activeFile = newOpenFiles.find(f => f.path === newActiveFileId);

      return {
        ...state,
        openFiles: newOpenFiles,
        activeFileId: newActiveFileId,
        markdown: activeFile ? activeFile.content : '',
        unsavedChanges: activeFile ? !!activeFile.isDirty : false
      };
    }

    default:
      return state;
  }
};
