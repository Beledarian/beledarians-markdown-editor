import React from 'react';
import SettingsModal from './SettingsModal';
import CheatSheetModal from './CheatSheetModal';
import ThemeExplorer from './ThemeExplorer';
import PrintModal from './PrintModal';
import ContextMenu from './ContextMenu';
import EditorContextMenu from './EditorContextMenu';
import FindReplaceModal from './FindReplaceModal';
import GlobalSearchModal from './GlobalSearchModal';
import McpAgentSetupModal from './McpAgentSetupModal';

export function WorkspaceOverlays({
  showMcpSetup,
  setShowMcpSetup,
  showThemeExplorer,
  setShowThemeExplorer,
  theme,
  setColorMode,
  codeTheme,
  setCodeTheme,
  shortcuts,
  onUpdateShortcut,
  imageSize,
  setImageSize,
  imageAlignment,
  setImageAlignment,
  workspaceStyle,
  setWorkspaceStyle,
  showGlobalSearch,
  setShowGlobalSearch,
  files,
  handleFileSelect,
  handleNavigate,
  showFindReplace,
  setShowFindReplace,
  markdown,
  handleFind,
  handleHighlightFind,
  handleReplace,
  handleReplaceAll,
  setMarkdown: _setMarkdown,
  showSettings,
  setShowSettings,
  fontSize,
  setFontSize,
  wordGoal,
  setWordGoal,
  showCheatSheet,
  setShowCheatSheet,
  showPrintModal,
  setShowPrintModal,
  contextMenu,
  setContextMenu,
  handleSaveFile,
  handleOpenFolder,
  handleCloseTab,
  handleInsertComment,
  handleEditComment,
  handleDeleteComment,
  editorContextMenu,
  setEditorContextMenu,
  insertTextAtCursor
}) {
  return (
    <>
      <ThemeExplorer
        isOpen={showThemeExplorer}
        onClose={() => setShowThemeExplorer(false)}
        currentTheme={theme}
        onThemeChange={setColorMode}
        currentCodeTheme={codeTheme}
        onCodeThemeChange={setCodeTheme}
        currentWorkspaceStyle={workspaceStyle}
        onWorkspaceStyleChange={setWorkspaceStyle}
      />
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        files={files}
        onFileSelect={handleFileSelect}
        onNavigate={handleNavigate}
      />
      <FindReplaceModal
        isOpen={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        markdown={markdown}
        onFind={handleFind}
        onHighlight={handleHighlightFind}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        wordGoal={wordGoal}
        setWordGoal={setWordGoal}
        codeTheme={codeTheme}
        setCodeTheme={setCodeTheme}
        shortcuts={shortcuts}
        onUpdateShortcut={onUpdateShortcut}
        imageSize={imageSize}
        setImageSize={setImageSize}
        imageAlignment={imageAlignment}
        setImageAlignment={setImageAlignment}
        workspaceStyle={workspaceStyle}
        setWorkspaceStyle={setWorkspaceStyle}
        colorMode={theme}
        setColorMode={setColorMode}
      />
      <CheatSheetModal
        isOpen={showCheatSheet}
        onClose={() => setShowCheatSheet(false)}
      />
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        markdown={markdown}
      />
      <McpAgentSetupModal
        isOpen={showMcpSetup}
        onClose={() => setShowMcpSetup(false)}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onClose={() => setContextMenu(null)}
          onSave={handleSaveFile}
          onOpenFolder={handleOpenFolder}
          onCloseTab={contextMenu.file ? () => {
            handleCloseTab(contextMenu.file.path);
            setContextMenu(null);
          } : null}
          onAddComment={contextMenu.sourceLine && contextMenu.type !== 'comment' ? () => {
            handleInsertComment(contextMenu.sourceLine);
            setContextMenu(null);
          } : null}
          onEditComment={contextMenu.sourceLine && contextMenu.type === 'comment' ? () => {
            handleEditComment(contextMenu.sourceLine);
            setContextMenu(null);
          } : null}
          onDeleteComment={contextMenu.sourceLine && contextMenu.type === 'comment' ? () => {
            handleDeleteComment(contextMenu.sourceLine);
            setContextMenu(null);
          } : null}
        />
      )}

      {editorContextMenu && (
        <EditorContextMenu
          x={editorContextMenu.x}
          y={editorContextMenu.y}
          onClose={() => setEditorContextMenu(null)}
          onCut={() => {
            document.execCommand('cut');
            setEditorContextMenu(null);
          }}
          onCopy={() => {
            document.execCommand('copy');
            setEditorContextMenu(null);
          }}
          onPaste={async () => {
            try {
              const text = await navigator.clipboard.readText();
              insertTextAtCursor(text);
            } catch {
              document.execCommand('paste');
            }
            setEditorContextMenu(null);
          }}
          onSelectAll={() => {
            const editor = document.querySelector('.w-md-editor-text-input');
            if (editor) editor.select();
            setEditorContextMenu(null);
          }}
        />
      )}
    </>
  );
}

export default WorkspaceOverlays;
