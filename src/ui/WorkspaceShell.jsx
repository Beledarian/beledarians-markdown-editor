import React from 'react';
import { resolveWorkspacePreset, WORKSPACE_STYLES } from './presets.js';

export default function WorkspaceShell({
  workspaceStyle,
  colorMode,
  platform,
  viewMode,
  className,
  titleRegion,
  commandRegion,
  activityRegion,
  navigatorRegion,
  tabsRegion,
  workspaceRegion,
  sourceRegion,
  renderRegion,
  outlineRegion,
  statusRegion,
  children,
}) {
  const preset = resolveWorkspacePreset({ workspaceStyle, colorMode });
  const style = preset.workspaceStyle;
  const mode = preset.colorMode;

  const styleMeta = WORKSPACE_STYLES[style] || WORKSPACE_STYLES.workbench;
  const layout = styleMeta.layout;
  const density = styleMeta.density;

  const theme = `${style}-${mode}`;
  const effectivePlatform = platform === 'macos' ? 'macos' : 'windows';

  const shellClassName = ['workspace-shell', className].filter(Boolean).join(' ');

  return (
    <div
      className={shellClassName}
      data-style={style}
      data-color-mode={mode}
      data-theme={theme}
      data-layout={layout}
      data-density={density}
      data-platform={effectivePlatform}
      data-view-mode={viewMode || 'live'}
      data-navigator-open={navigatorRegion ? 'true' : 'false'}
      data-outline-open={outlineRegion ? 'true' : 'false'}
    >
      {titleRegion && <header className="title-region">{titleRegion}</header>}
      {commandRegion && <div className="command-region">{commandRegion}</div>}
      {activityRegion && <aside className="activity-region">{activityRegion}</aside>}
      {navigatorRegion && <nav className="navigator-region">{navigatorRegion}</nav>}
      {tabsRegion && <div className="tabs-region">{tabsRegion}</div>}

      <main className="workspace-region" aria-label={`${style} Markdown workspace`}>
        {workspaceRegion}
        {sourceRegion && <div className="source-region">{sourceRegion}</div>}
        {renderRegion && <div className="render-region">{renderRegion}</div>}
        {children}
        {outlineRegion && <aside className="outline-region">{outlineRegion}</aside>}
      </main>

      {statusRegion && <footer className="status-region">{statusRegion}</footer>}
    </div>
  );
}
