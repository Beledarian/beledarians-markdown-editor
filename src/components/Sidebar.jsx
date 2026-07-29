import { useState, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Virtuoso } from 'react-virtuoso';
import SidebarContextMenu from './SidebarContextMenu';
import Icon from './Icon';
import './WorkspaceChrome.css';

const SECTIONS = [
  { id: 'files', label: 'Files', icon: 'document' },
  { id: 'assets', label: 'Assets', icon: 'image' },
  { id: 'outline', label: 'Outline', icon: 'outline' },
];

const filterItems = (items, filter, getValue) => items.filter((item) => {
  const value = getValue(item);
  try {
    if (filter.startsWith('/')) {
      return new RegExp(filter.slice(1), 'i').test(value);
    }
    const search = filter.toLowerCase();
    const candidate = value.toLowerCase();
    let candidateIndex = 0;
    let searchIndex = 0;
    while (candidateIndex < candidate.length && searchIndex < search.length) {
      if (candidate[candidateIndex] === search[searchIndex]) searchIndex += 1;
      candidateIndex += 1;
    }
    return searchIndex === search.length;
  } catch {
    return value.toLowerCase().includes(filter.toLowerCase());
  }
});

const Sidebar = ({
  files,
  assets,
  loading,
  ignorePatterns,
  currentFile,
  onFileSelect,
  onInsertImage,
  onRefresh,
  onAddIgnore,
  onRemoveIgnore,
  onOpenFolder,
  onCreateNewFile,
  hasFolderOpen,
  headings = [],
  onHeadingClick,
  onRenameFile,
  onDeleteFile,
  onOpenThemeExplorer,
  onOpenGlobalSearch,
  onOpenFileExternal,
  activeSection,
  onActiveSectionChange,
}) => {
  const [filter, setFilter] = useState('');
  const [newIgnore, setNewIgnore] = useState('');
  const [showIgnoreSettings, setShowIgnoreSettings] = useState(false);
  const [internalSection, setInternalSection] = useState('files');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const resolvedSection = SECTIONS.some(({ id }) => id === activeSection)
    ? activeSection
    : internalSection;

  const selectSection = useCallback((section) => {
    if (activeSection === undefined) setInternalSection(section);
    onActiveSectionChange?.(section);
    setFilter('');
  }, [activeSection, onActiveSectionChange]);

  const handleContextMenu = useCallback((event, item) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      item,
    });
  }, []);

  const submitRename = useCallback(async () => {
    if (renamingPath && renameValue) {
      const oldName = files.find((item) => item.path === renamingPath)?.name;
      if (oldName && oldName !== renameValue) {
        try {
          await onRenameFile(oldName, renameValue);
        } catch {
          return;
        }
      }
    }
    setRenamingPath(null);
    setRenameValue('');
  }, [renamingPath, renameValue, files, onRenameFile]);

  const filteredFiles = useMemo(
    () => filterItems(files, filter, (file) => file.name),
    [files, filter],
  );
  const filteredAssets = useMemo(
    () => filterItems(assets, filter, (asset) => asset.name),
    [assets, filter],
  );
  const filteredHeadings = useMemo(
    () => filterItems(headings, filter, (heading) => heading.text),
    [headings, filter],
  );

  const items = useMemo(() => {
    if (resolvedSection === 'assets') return filteredAssets;
    if (resolvedSection === 'outline') return filteredHeadings;
    return filteredFiles;
  }, [resolvedSection, filteredFiles, filteredAssets, filteredHeadings]);

  const handleAddIgnoreSubmit = () => {
    if (!newIgnore) return;
    onAddIgnore(newIgnore);
    setNewIgnore('');
  };

  const handleCreateNewFileSubmit = () => {
    if (!newFileName.trim()) return;
    onCreateNewFile(newFileName);
    setNewFileName('');
    setShowNewFileInput(false);
  };

  const Row = useCallback((index) => {
    const item = items[index];
    const displayIndex = String(index + 1).padStart(2, '0');
    if (resolvedSection === 'files') {
      const isRenaming = renamingPath === item.path;
      if (isRenaming) {
        return (
          <div className="file-item navigator-row editing">
            <Icon name="document" />
            <input
              type="text"
              aria-label={`Rename ${item.name}`}
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onBlur={submitRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitRename();
                if (event.key === 'Escape') setRenamingPath(null);
              }}
              autoFocus
            />
          </div>
        );
      }

      return (
        <button
          type="button"
          className={`file-item navigator-row ${currentFile?.path === item.path ? 'active' : ''}`}
          aria-label={`${displayIndex} ${item.name}`}
          aria-current={currentFile?.path === item.path ? 'page' : undefined}
          onClick={() => onFileSelect(item)}
          onContextMenu={(event) => handleContextMenu(event, item)}
          draggable="true"
          onDragStart={(event) => {
            event.dataTransfer.setData('application/json', JSON.stringify({
              type: 'sidebar-file',
              path: item.path,
              name: item.name,
            }));
            event.dataTransfer.effectAllowed = 'copy';
          }}
        >
          <span className="navigator-index">{displayIndex}</span>
          <Icon name="document" />
          <span className="navigator-row-copy">
            <span className="navigator-row-title">{item.name}</span>
            <span className="navigator-row-meta">Markdown document</span>
          </span>
        </button>
      );
    }

    if (resolvedSection === 'assets') {
      return (
        <button
          type="button"
          className="file-item asset-item navigator-row"
          aria-label={`${displayIndex} Insert ${item.name}`}
          title={`Insert ${item.name}`}
          onClick={() => onInsertImage?.(item)}
        >
          <span className="navigator-index">{displayIndex}</span>
          <Icon name="image" />
          <span className="navigator-row-copy">
            <span className="navigator-row-title">{item.name}</span>
            <span className="navigator-row-meta">Insert image</span>
          </span>
        </button>
      );
    }

    const level = Math.max(1, Math.min(6, item.level || 1));
    return (
      <button
        type="button"
        className={`file-item navigator-row outline-row outline-level-${level}`}
        aria-label={`${displayIndex} ${item.text}`}
        onClick={() => onHeadingClick?.(item.line)}
      >
        <span className="navigator-index">{displayIndex}</span>
        <Icon name="outline" />
        <span className="navigator-row-title">{item.text}</span>
      </button>
    );
  }, [
    items,
    resolvedSection,
    currentFile,
    renamingPath,
    renameValue,
    onFileSelect,
    onInsertImage,
    onHeadingClick,
    handleContextMenu,
    submitRename,
  ]);

  const sectionCount = {
    files: filteredFiles.length,
    assets: filteredAssets.length,
    outline: filteredHeadings.length,
  };
  const filterPlaceholder = {
    files: 'Filter files...',
    assets: 'Filter images...',
    outline: 'Filter outline...',
  }[resolvedSection];

  return (
    <div className="sidebar workspace-navigator" data-section={resolvedSection}>
      <div className="sidebar-header">
        <div className="navigator-heading">
          <span className="navigator-kicker">
            {resolvedSection === 'files' ? 'Workspace' : resolvedSection}
          </span>
          <span className="navigator-count">{sectionCount[resolvedSection]}</span>
        </div>

        <div className="navigator-open-actions">
          <button type="button" onClick={onOpenFolder} className="primary-btn">
            <Icon name="folder" />
            <span>Open folder</span>
          </button>
          <button
            type="button"
            className="secondary-btn chrome-icon-button"
            aria-label="Open Markdown file"
            title="Open Markdown file"
            onClick={async () => {
              if (!onOpenFileExternal) return;
              try {
                await onOpenFileExternal();
              } catch (error) {
                console.error('Failed to open file dialog', error);
              }
            }}
          >
            <Icon name="externalFile" />
          </button>
        </div>

        {hasFolderOpen && (showNewFileInput ? (
          <div className="new-file-input">
            <input
              type="text"
              placeholder="filename.md"
              aria-label="New file name"
              value={newFileName}
              onChange={(event) => setNewFileName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateNewFileSubmit();
                if (event.key === 'Escape') {
                  setShowNewFileInput(false);
                  setNewFileName('');
                }
              }}
              autoFocus
            />
            <button type="button" onClick={handleCreateNewFileSubmit} aria-label="Create file">
              <Icon name="check" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewFileInput(false);
                setNewFileName('');
              }}
              aria-label="Cancel new file"
            >
              <Icon name="close" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowNewFileInput(true)} className="secondary-btn full-width new-file-button">
            <Icon name="filePlus" />
            <span>New file</span>
          </button>
        ))}
      </div>

      <div className="sidebar-tabs" role="tablist" aria-label="Navigator section">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={resolvedSection === section.id}
            className={resolvedSection === section.id ? 'active' : ''}
            onClick={() => selectSection(section.id)}
          >
            <Icon name={section.icon} />
            <span>{section.label}</span>
            <span className="section-count">{sectionCount[section.id]}</span>
          </button>
        ))}
      </div>

      <label className="sidebar-search">
        <span className="visually-hidden">{filterPlaceholder.replace('...', '')}</span>
        <Icon name="search" />
        <input
          type="search"
          placeholder={filterPlaceholder}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </label>

      <div className="sidebar-actions" aria-label="Navigator actions">
        <button
          type="button"
          className="text-btn"
          aria-expanded={showIgnoreSettings}
          onClick={() => setShowIgnoreSettings(!showIgnoreSettings)}
        >
          <Icon name="settings" />
          <span>Ignore rules</span>
        </button>
        <button type="button" className="text-btn" onClick={onRefresh}>
          <Icon name="refresh" />
          <span>Refresh</span>
        </button>
        <button type="button" className="text-btn" onClick={onOpenGlobalSearch}>
          <Icon name="search" />
          <span>Search</span>
        </button>
      </div>

      {showIgnoreSettings && (
        <section className="ignore-settings" aria-labelledby="ignore-patterns-heading">
          <h2 id="ignore-patterns-heading">Ignore patterns</h2>
          <div className="add-ignore">
            <input
              type="text"
              aria-label="Ignore pattern"
              placeholder="e.g. draft"
              value={newIgnore}
              onChange={(event) => setNewIgnore(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAddIgnoreSubmit()}
            />
            <button type="button" onClick={handleAddIgnoreSubmit} aria-label="Add Ignore Pattern">Add</button>
          </div>
          <div className="ignore-list">
            {ignorePatterns.map((pattern) => (
              <span key={pattern} className="ignore-tag">
                {pattern}
                <button type="button" onClick={() => onRemoveIgnore(pattern)} aria-label={`Remove ${pattern}`}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="file-list" role="tabpanel" aria-label={`${resolvedSection} navigator`}>
        {loading ? (
          <div className="loading" role="status">Scanning workspace...</div>
        ) : items.length > 0 ? (
          <Virtuoso
            className="navigator-virtuoso"
            totalCount={items.length}
            itemContent={Row}
          />
        ) : (
          <div className="empty-state">
            <Icon name={resolvedSection === 'assets' ? 'image' : resolvedSection === 'outline' ? 'outline' : 'document'} />
            <span>No {resolvedSection} found</span>
          </div>
        )}
      </div>

      <div className="navigator-footer">
        <span>{files.length} files</span>
        <button type="button" className="text-btn" onClick={onOpenThemeExplorer}>
          <Icon name="settings" />
          <span>Appearance</span>
        </button>
      </div>

      {contextMenu && (
        <SidebarContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            setRenameValue(contextMenu.item.name);
            setRenamingPath(contextMenu.item.path);
          }}
          onDelete={() => onDeleteFile(contextMenu.item.path)}
          onOpenInNewWindow={() => {
            invoke('open_new_window', { path: contextMenu.item.path })
              .catch((error) => console.error('Failed to open new window', error));
          }}
        />
      )}
    </div>
  );
};

export default Sidebar;
