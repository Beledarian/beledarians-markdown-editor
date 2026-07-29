import React from 'react';
import Tooltip from './Tooltip';
import ColorPicker from './ColorPicker';
import Icon from './Icon';
import './WorkspaceChrome.css';

const STYLE_LABELS = {
  workbench: 'Workbench',
  reading: 'Reading Room',
  operator: 'Operator',
};

const VIEW_MODES = [
  { id: 'edit', label: 'Edit', icon: 'edit' },
  { id: 'preview', label: 'Preview', icon: 'preview' },
  { id: 'live', label: 'Split', icon: 'split' },
];

function ToolButton({ label, shortcut, icon, pressed, className = '', children, ...props }) {
  return (
    <Tooltip text={label} shortcut={shortcut}>
      <button
        aria-label={label}
        aria-pressed={typeof pressed === 'boolean' ? pressed : undefined}
        className={['chrome-button', className].filter(Boolean).join(' ')}
        type="button"
        {...props}
      >
        {icon && <Icon name={icon} />}
        {children && <span className="chrome-button-label">{children}</span>}
      </button>
    </Tooltip>
  );
}

const Toolbar = ({
  sidebarOpen,
  setSidebarOpen,
  savedHandle,
  dirHandle,
  handleRestoreFolder,
  handleOpenFile,
  handleSaveFile,
  handleSaveAs,
  handleExportHTML,
  handleExportPDF,
  copyToClipboard,
  handleColorChange,
  handleHighlight,
  onFormatSyntax,
  theme,
  toggleTheme,
  workspaceStyle,
  setWorkspaceStyle,
  setShowSettings,
  setShowCheatSheet,
  setShowMcpSetup,
  showMcpSetupControl = false,
  zenMode,
  setZenMode,
  fontSize,
  setFontSize,
  autoSaveEnabled,
  setAutoSaveEnabled,
  shortcuts = {},
  onFileLoad,
  handleCopyHTML,
  handleInsertTemplate,
  templates,
  typewriterMode,
  setTypewriterMode,
  focusMode,
  setFocusMode,
  vimMode,
  setVimMode,
  showMiniMap,
  setShowMiniMap,
  scrollSynced,
  setScrollSynced,
  viewMode,
  setViewMode,
  workspaceName,
  currentFile,
}) => {
  const styleLabel = STYLE_LABELS[workspaceStyle] || STYLE_LABELS.workbench;

  return (
    <header className="top-bar workspace-toolbar" data-tauri-drag-region aria-label="Main Toolbar">
      <div className="command-identity">
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Icon name="menu" />
        </button>
        {/* Operator style collapses the identity to a single dense mark; the
            product/workspace names take over in workbench and reading. */}
        <span className="operator-mark" aria-hidden="true">M</span>
        <span className="product-name">Beledarians Markdown Editor</span>
        <span className="workspace-name">{styleLabel}</span>
        {(workspaceName || currentFile) && (
          <span
            className="command-breadcrumb"
            title={currentFile?.path || currentFile?.name || 'Untitled'}
          >
            {workspaceName ? `${workspaceName} / ` : ''}{currentFile?.name || 'Untitled'}
          </span>
        )}
      </div>

      {savedHandle && !dirHandle && (
        <button className="restore-workspace" type="button" onClick={handleRestoreFolder}>
          <Icon name="folder" />
          <span>Restore {savedHandle.name}</span>
        </button>
      )}

      {setViewMode && (
        <div className="view-mode-segment" role="group" aria-label="View mode">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={viewMode === mode.id ? 'active' : ''}
              aria-pressed={viewMode === mode.id}
              onClick={() => setViewMode(mode.id)}
            >
              <Icon name={mode.icon} />
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="button-container command-actions">
        <input
          type="file"
          accept=".md,.markdown"
          onChange={onFileLoad}
          className="visually-hidden"
          id="file-input"
        />

        <ToolButton
          label="Open Markdown file"
          icon="externalFile"
          className="file-command"
          onClick={handleOpenFile}
        >
          Open
        </ToolButton>

        <ToolButton
          label="Save file"
          shortcut={shortcuts.save}
          icon="save"
          className="primary-command file-command"
          onClick={handleSaveFile}
        >
          Save
        </ToolButton>

        <details className="command-menu export-menu">
          <summary aria-label="Export and copy actions">
            <Icon name="download" />
            <span>Export</span>
            <Icon name="chevronDown" size={12} />
          </summary>
          <div className="command-menu-popover command-menu-grid">
            <button type="button" onClick={handleSaveAs}>
              <Icon name="save" /><span>Save Markdown copy</span>
            </button>
            <button type="button" onClick={handleExportHTML}>
              <Icon name="download" /><span>Export HTML</span><kbd>{shortcuts.html}</kbd>
            </button>
            <button type="button" onClick={handleExportPDF}>
              <Icon name="download" /><span>Export PDF</span><kbd>{shortcuts.pdf}</kbd>
            </button>
            <button type="button" onClick={copyToClipboard}>
              <Icon name="copy" /><span>Copy Markdown</span><kbd>{shortcuts.copyAll}</kbd>
            </button>
            <button type="button" onClick={handleCopyHTML}>
              <Icon name="copy" /><span>Copy HTML</span>
            </button>
          </div>
        </details>

        <div className="quick-format-cluster" role="group" aria-label="Quick Formatting">
          <ToolButton label="Bold text" icon="bold" onClick={() => onFormatSyntax?.('bold')} />
          <ToolButton label="Italic text" icon="italic" onClick={() => onFormatSyntax?.('italic')} />
          <ToolButton label="Strikethrough" icon="strikethrough" onClick={() => onFormatSyntax?.('strikethrough')} />
          <ToolButton label="Inline code" icon="code" onClick={() => onFormatSyntax?.('code')} />
          <ToolButton label="Insert link" icon="link" onClick={() => onFormatSyntax?.('link')} />
          <ToolButton label="Insert table" icon="table" onClick={() => onFormatSyntax?.('table')} />
          <ToolButton label="Insert task list" icon="list" onClick={() => onFormatSyntax?.('tasklist')} />
          <ToolButton label="Insert blockquote" icon="quote" onClick={() => onFormatSyntax?.('quote')} />
        </div>

        <details className="command-menu format-menu">
          <summary aria-label="Formatting actions">
            <Icon name="edit" />
            <span>Format</span>
            <Icon name="chevronDown" size={12} />
          </summary>
          <div className="command-menu-popover format-popover">
            <label className="toolbar-field">
              <span>Template</span>
              <select
                aria-label="Insert template"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) {
                    handleInsertTemplate(event.target.value);
                    event.target.value = '';
                  }
                }}
              >
                <option value="" disabled>Choose template</option>
                {templates?.map((template) => (
                  <option key={template.name} value={template.content}>{template.name}</option>
                ))}
              </select>
            </label>
            <div className="format-actions">
              <ColorPicker onColorSelect={handleColorChange} />
              <button type="button" onClick={handleHighlight}>
                <Icon name="highlight" />
                <span>Highlight selection</span>
              </button>
            </div>
          </div>
        </details>

        <details className="command-menu mode-menu">
          <summary aria-label="Editor modes and preferences">
            <Icon name="more" />
            <span>Modes</span>
            <Icon name="chevronDown" size={12} />
          </summary>
          <div className="command-menu-popover mode-popover">
            <div className="mode-grid" aria-label="Editor modes">
              <button type="button" aria-pressed={typewriterMode} onClick={() => setTypewriterMode(!typewriterMode)}>Typewriter</button>
              <button type="button" aria-pressed={zenMode} onClick={() => setZenMode(!zenMode)}>Zen</button>
              <button type="button" aria-pressed={focusMode} onClick={() => setFocusMode(!focusMode)}>Focus</button>
              <button type="button" aria-pressed={vimMode} onClick={() => setVimMode(!vimMode)}>Vim</button>
              <button type="button" aria-pressed={showMiniMap} onClick={() => setShowMiniMap(!showMiniMap)}>Mini map</button>
              <button type="button" aria-pressed={scrollSynced} onClick={() => setScrollSynced(!scrollSynced)}>
                <Icon name={scrollSynced ? 'link' : 'unlock'} />
                Scroll sync
              </button>
            </div>
            <div className="font-size-control" role="group" aria-label="Editor font size">
              <button type="button" onClick={() => setFontSize((size) => size - 1)} aria-label="Decrease Font Size">Decrease</button>
              <output aria-live="polite">{fontSize} px</output>
              <button type="button" onClick={() => setFontSize((size) => size + 1)} aria-label="Increase Font Size">Increase</button>
            </div>
            <label className="autosave-control">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(event) => setAutoSaveEnabled(event.target.checked)}
              />
              <span>Auto-save</span>
            </label>
          </div>
        </details>

        {setWorkspaceStyle && (
          <label className="workspace-style-control">
            <span className="visually-hidden">Workspace Style</span>
            <select
              value={workspaceStyle || 'workbench'}
              onChange={(event) => setWorkspaceStyle(event.target.value)}
              aria-label="Workspace Style"
            >
              <option value="workbench">Workbench</option>
              <option value="reading">Reading Room</option>
              <option value="operator">Operator</option>
            </select>
          </label>
        )}

        <ToolButton
          label="Toggle Theme"
          shortcut={shortcuts.theme}
          icon={theme === 'dark' ? 'sun' : 'moon'}
          className="chrome-icon-button"
          onClick={toggleTheme}
        />
        <ToolButton
          label="Settings"
          shortcut={shortcuts.settings}
          icon="settings"
          className="chrome-icon-button"
          onClick={() => setShowSettings(true)}
        />
        {showMcpSetupControl && (
          <ToolButton
            label="AI agent setup"
            icon="link"
            className="chrome-icon-button"
            onClick={() => setShowMcpSetup(true)}
          />
        )}
        <ToolButton
          label="Markdown Cheat Sheet"
          shortcut={shortcuts.cheatsheet}
          icon="help"
          className="chrome-icon-button"
          onClick={() => setShowCheatSheet(true)}
        />
      </div>
    </header>
  );
};

export default Toolbar;
