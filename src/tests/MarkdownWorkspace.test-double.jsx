import React from 'react';

export function MarkdownWorkspace({
  openFiles,
  markdown,
  viewMode,
  setMarkdown,
  setUnsavedChanges,
}) {
  if (openFiles.length === 0) {
    return <div>Start writing</div>;
  }

  if (viewMode === 'preview') {
    return <div className="w-md-editor-show-preview">{markdown}</div>;
  }

  return (
    <div className="w-md-editor">
      <textarea
        aria-label="Document content"
        className="w-md-editor-text-input"
        value={markdown}
        onChange={(event) => {
          setMarkdown(event.target.value);
          setUnsavedChanges(true);
        }}
      />
      <div className="wmde-markdown">{markdown}</div>
    </div>
  );
}

export default MarkdownWorkspace;
