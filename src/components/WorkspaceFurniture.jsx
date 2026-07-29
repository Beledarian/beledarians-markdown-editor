import React from 'react';
import './WorkspaceFurniture.css';

const iconPaths = {
  files: <><path d="M3.5 5.5h6l1.7 2H20.5v11h-17z" /><path d="M3.5 9h17" /></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 5 5" /></>,
  outline: <><path d="M5 5h14M5 12h10M5 19h14" /><circle cx="2.5" cy="5" r=".6" /><circle cx="2.5" cy="12" r=".6" /><circle cx="2.5" cy="19" r=".6" /></>,
  export: <><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" /><path d="M5 13v7h14v-7" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5 7 7M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18h1.4a2 2 0 0 0 0-4H12a1.7 1.7 0 0 1 0-3.4h3A6 6 0 0 0 21 8c0-3-4-5-9-5Z" /><circle cx="7.5" cy="8" r=".7" /><circle cx="11" cy="6" r=".7" /><circle cx="15" cy="7" r=".7" /></>,
};

function FurnitureIcon({ name }) {
  return (
    <svg
      aria-hidden="true"
      className="furniture-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function RailButton({ label, icon, active = false, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`activity-button ${active ? 'is-active' : ''} ${className}`.trim()}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      onClick={onClick}
    >
      <FurnitureIcon name={icon} />
      <span className="activity-label">{label}</span>
    </button>
  );
}

export function WorkspaceTitle({ workspaceName, currentFile, workspaceStyle }) {
  const filename = currentFile?.name || 'Untitled';
  const path = currentFile?.path && currentFile.path !== 'draft'
    ? currentFile.path
    : filename;

  return (
    <div className="workspace-title">
      <div className="workspace-title__brand">
        <span className="workspace-title__mark" aria-hidden="true">M</span>
        <span>Markdown Editor</span>
      </div>
      <div className="workspace-title__path" title={path}>
        {workspaceName && <span>{workspaceName}</span>}
        {workspaceName && <span className="workspace-title__separator">/</span>}
        <strong>{filename}</strong>
      </div>
      <div className="workspace-title__style">{workspaceStyle}</div>
    </div>
  );
}

export function ActivityRail({
  activeSection,
  onSectionChange,
  onSearch,
  onExport,
  onThemes,
  onSettings,
}) {
  return (
    <nav className="activity-rail" aria-label="Workspace tools">
      <RailButton
        label="Files"
        icon="files"
        active={activeSection === 'files'}
        onClick={() => onSectionChange?.('files')}
      />
      <RailButton label="Search" icon="search" onClick={onSearch} />
      <RailButton
        label="Outline"
        icon="outline"
        active={activeSection === 'outline'}
        onClick={() => onSectionChange?.('outline')}
      />
      <RailButton label="Export" icon="export" onClick={onExport} />
      <RailButton label="Themes" icon="palette" onClick={onThemes} className="activity-button--lower" />
      <RailButton label="Settings" icon="settings" onClick={onSettings} />
    </nav>
  );
}

export function OutlineRail({ headings, onHeadingClick }) {
  return (
    <nav className="outline-rail" aria-label="On this page">
      <div className="outline-rail__label">On this page</div>
      {headings?.length ? (
        <ol className="outline-rail__list">
          {headings.map((heading, index) => (
            <li key={`${heading.text}-${heading.line}-${index}`}>
              <button
                type="button"
                className={`outline-rail__item outline-rail__item--level-${Math.min(heading.level || 1, 4)}`}
                onClick={() => onHeadingClick?.(heading.line)}
                title={heading.text}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="outline-rail__empty">Headings appear here as you write.</p>
      )}
    </nav>
  );
}
