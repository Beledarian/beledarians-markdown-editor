import { describe, it, expect } from 'vitest';
import { documentSessionReducer, initialDocumentState } from './documentSessionReducer';

describe('documentSessionReducer', () => {
  it('opens a new document and sets active tab ID and markdown content', () => {
    const file = { path: 'C:/docs/a.md', name: 'a.md', content: '# Hello' };
    const nextState = documentSessionReducer(initialDocumentState, {
      type: 'document/opened',
      payload: { fileObj: file }
    });

    expect(nextState.openFiles).toHaveLength(1);
    expect(nextState.activeFileId).toBe('C:/docs/a.md');
    expect(nextState.markdown).toBe('# Hello');
    expect(nextState.unsavedChanges).toBe(false);
  });

  it('updates markdown content and sets unsavedChanges to true on document/edited', () => {
    const stateWithFile = {
      ...initialDocumentState,
      openFiles: [{ path: 'C:/docs/a.md', name: 'a.md', content: '', isDirty: false }],
      activeFileId: 'C:/docs/a.md'
    };

    const nextState = documentSessionReducer(stateWithFile, {
      type: 'document/edited',
      payload: { content: '# New Content' }
    });

    expect(nextState.markdown).toBe('# New Content');
    expect(nextState.unsavedChanges).toBe(true);
    expect(nextState.openFiles[0].isDirty).toBe(true);
  });

  it('preserves dirty state when switching tabs', () => {
    const state = {
      ...initialDocumentState,
      openFiles: [
        { path: 'C:/docs/a.md', content: 'Doc A Edited', isDirty: true },
        { path: 'C:/docs/b.md', content: 'Doc B Clean', isDirty: false }
      ],
      activeFileId: 'C:/docs/a.md',
      markdown: 'Doc A Edited',
      unsavedChanges: true
    };

    // Switch to Clean Tab B
    const stateTabB = documentSessionReducer(state, {
      type: 'tab/activated',
      payload: { path: 'C:/docs/b.md' }
    });
    expect(stateTabB.activeFileId).toBe('C:/docs/b.md');
    expect(stateTabB.unsavedChanges).toBe(false);

    // Switch back to Dirty Tab A
    const stateTabA = documentSessionReducer(stateTabB, {
      type: 'tab/activated',
      payload: { path: 'C:/docs/a.md' }
    });
    expect(stateTabA.activeFileId).toBe('C:/docs/a.md');
    expect(stateTabA.unsavedChanges).toBe(true);
  });

  it('clears unsavedChanges on document/saved', () => {
    const dirtyState = {
      ...initialDocumentState,
      openFiles: [{ path: 'C:/docs/a.md', name: 'a.md', content: 'edited', isDirty: true }],
      activeFileId: 'C:/docs/a.md',
      unsavedChanges: true
    };

    const nextState = documentSessionReducer(dirtyState, {
      type: 'document/saved',
      payload: { path: 'C:/docs/a.md' }
    });

    expect(nextState.unsavedChanges).toBe(false);
    expect(nextState.openFiles[0].isDirty).toBe(false);
  });

  it('replaces the active draft when saving it to a native path', () => {
    const dirtyState = {
      ...initialDocumentState,
      openFiles: [{
        name: 'Untitled.md',
        path: 'draft-1',
        storageKind: 'draft',
        content: '# Draft',
        isDirty: true
      }],
      activeFileId: 'draft-1',
      markdown: '# Draft',
      unsavedChanges: true
    };

    const nextState = documentSessionReducer(dirtyState, {
      type: 'document/savedAs',
      payload: {
        fileObj: {
          name: 'notes.md',
          path: 'C:\\notes.md',
          storageKind: 'native-path',
          content: '# Draft',
          lastModified: 42
        }
      }
    });

    expect(nextState.activeFileId).toBe('C:\\notes.md');
    expect(nextState.openFiles).toHaveLength(1);
    expect(nextState.openFiles[0]).toEqual(expect.objectContaining({
      path: 'C:\\notes.md',
      isDirty: false,
      unsaved: false
    }));
    expect(nextState.unsavedChanges).toBe(false);
  });

  it('closes active tab and selects adjacent remaining tab with correct dirty state', () => {
    const state = {
      ...initialDocumentState,
      openFiles: [
        { path: 'C:/docs/a.md', content: 'Doc A', isDirty: false },
        { path: 'C:/docs/b.md', content: 'Doc B Dirty', isDirty: true }
      ],
      activeFileId: 'C:/docs/a.md',
      markdown: 'Doc A',
      unsavedChanges: false
    };

    const nextState = documentSessionReducer(state, {
      type: 'tab/closed',
      payload: { path: 'C:/docs/a.md' }
    });

    expect(nextState.openFiles).toHaveLength(1);
    expect(nextState.activeFileId).toBe('C:/docs/b.md');
    expect(nextState.markdown).toBe('Doc B Dirty');
    expect(nextState.unsavedChanges).toBe(true);
  });
});
