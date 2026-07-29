import React from 'react';
import MDEditor from '@uiw/react-md-editor';
import StartScreen from '../../components/StartScreen';
import EditorMiniMap from '../../components/EditorMiniMap';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkMath from 'remark-math';
import remarkToc from 'remark-toc';
import remarkGfm from 'remark-gfm';
import { sanitizeSchema } from '../../utils/markdownProcessing';
import { remarkCustomSyntax } from '../../utils/remarkCustomSyntax';
import rehypeInjectLineNumber from '../../utils/rehypeInjectLineNumber';
import rehypeVisibleComments from '../../utils/rehypeVisibleComments';

export function MarkdownWorkspace({
  openFiles,
  markdown,
  debouncedMarkdown,
  viewMode,
  fontSize,
  zenMode,
  showMiniMap,
  components,
  handleDrop,
  handleDragOver,
  handleCursorActivity,
  setMarkdown,
  setUnsavedChanges,
  openFolder,
  handleCreateNewFile,
  recentFiles,
  handleFileSelect
}) {
  return (
    <div className="main-area" onDrop={handleDrop} onDragOver={handleDragOver} style={{ fontSize: `${fontSize}px` }}>
      <div className="editor-container" style={{ gridTemplateColumns: (!zenMode && showMiniMap && viewMode !== 'preview') ? '1fr 60px' : '1fr' }}>
        {openFiles.length === 0 ? (
          <StartScreen
            onOpenFolder={openFolder}
            onCreateNewFile={(name) => handleCreateNewFile(name || 'Untitled.md')}
            recentFiles={recentFiles}
            onFileSelect={handleFileSelect}
          />
        ) : viewMode === 'preview' ? (
          <div className="w-md-editor-show-preview" style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <MDEditor.Markdown
              source={debouncedMarkdown}
              components={components}
              remarkPlugins={[remarkCustomSyntax, remarkMath, remarkGfm, [remarkToc, { heading: 'Table of Contents', tight: true }]]}
              rehypePlugins={[
                rehypeVisibleComments,
                rehypeInjectLineNumber,
                rehypeRaw,
                [rehypeSanitize, sanitizeSchema],
                [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
                rehypeKatex,
                rehypeSlug
              ]}
            />
          </div>
        ) : (
          <MDEditor
            value={markdown}
            onChange={(val) => {
              setMarkdown(val);
              setUnsavedChanges(true);
            }}
            height="100%"
            onSelect={handleCursorActivity}
            onKeyUp={handleCursorActivity}
            onClick={handleCursorActivity}
            visibleDragbar={false}
            enableScroll={false}
            preview={viewMode}
            previewOptions={{
              components: components,
              remarkPlugins: [remarkCustomSyntax, remarkMath, remarkGfm, [remarkToc, { heading: 'Table of Contents', tight: true }]],
              rehypePlugins: [
                rehypeVisibleComments,
                rehypeInjectLineNumber,
                rehypeRaw,
                [rehypeSanitize, sanitizeSchema],
                [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
                rehypeKatex,
                rehypeSlug
              ]
            }}
          />
        )}
        {openFiles.length > 0 && !zenMode && showMiniMap && viewMode !== 'preview' && (
          <EditorMiniMap
            text={debouncedMarkdown}
          />
        )}
      </div>
    </div>
  );
}

export default MarkdownWorkspace;
