import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(currentDir, '..');

const readSource = (relativePath) => fs.readFileSync(path.join(srcDir, relativePath), 'utf8');

describe('workspace chrome overflow contracts', () => {
  it('keeps command chrome non-scrolling at the 1200px and 900px contracts', () => {
    const chromeCss = readSource('components/WorkspaceChrome.css');
    const panesCss = readSource('ui/components/panes.css');

    expect(chromeCss).toContain('@media (max-width: 1280px)');
    expect(chromeCss).toContain('@media (max-width: 960px)');
    expect(chromeCss).toMatch(/\.workspace-shell \.workspace-command\s*\{[\s\S]*?overflow: hidden;/);
    expect(chromeCss).toMatch(/\.workspace-shell \.command-actions\s*\{[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow: hidden;/);
    expect(panesCss).toMatch(/\.command-region \.button-container\s*\{[\s\S]*?overflow-x: hidden;/);
  });

  it('keeps compact Save and Export access while secondary commands collapse', () => {
    const toolbarSource = readSource('components/Toolbar.jsx');
    const chromeCss = readSource('components/WorkspaceChrome.css');

    expect(toolbarSource).toContain('className="command-menu export-menu"');
    expect(chromeCss).toMatch(
      /\[data-style='reading'\] \.command-actions > \.format-menu,[\s\S]*?\.command-actions > \.mode-menu,[\s\S]*?display: none;/,
    );
    expect(chromeCss).not.toContain(
      ".workspace-shell[data-style='reading'] .command-actions > .primary-command,",
    );
    expect(chromeCss).not.toContain(
      ".workspace-shell[data-style='reading'] .command-actions > .command-menu,",
    );
    expect(chromeCss).toMatch(
      /@media \(max-width: 960px\)[\s\S]*?\.command-actions > \.format-menu,[\s\S]*?\.command-actions > \.mode-menu,[\s\S]*?button\.file-command[\s\S]*?width: 44px;/,
    );
    expect(chromeCss).not.toMatch(
      /@media \(max-width: 960px\)[\s\S]*?\.command-actions > \.command-menu,/,
    );
  });

  it('reserves macOS traffic-light space without changing Windows command padding', () => {
    const appSource = readSource('App.jsx');
    const shellSource = readSource('ui/WorkspaceShell.jsx');
    const chromeCss = readSource('components/WorkspaceChrome.css');

    expect(appSource).toContain("const workspacePlatform = isMac ? 'macos' : 'windows';");
    expect(appSource).toContain('platform={workspacePlatform}');
    expect(shellSource).toContain("platform === 'macos' ? 'macos' : 'windows'");
    expect(chromeCss).toMatch(
      /\.workspace-shell\[data-platform='macos'\] \.workspace-command\s*\{[\s\S]*?--workspace-macos-titlebar-safe-inset: 80px;[\s\S]*?padding-inline-start: max\([\s\S]*?env\(safe-area-inset-left, 0px\)[\s\S]*?\);/,
    );
    expect(chromeCss).toMatch(
      /\.workspace-shell \.workspace-command\s*\{[\s\S]*?padding: 0 var\(--ui-space-6\);/,
    );
    expect(chromeCss).not.toContain("[data-platform='windows'] .workspace-command");
    expect(chromeCss.indexOf("[data-platform='macos'] .workspace-command"))
      .toBeLessThan(chromeCss.indexOf('@media (max-width: 960px)'));

    const compactRules = chromeCss.slice(
      chromeCss.indexOf('@media (max-width: 960px)'),
      chromeCss.indexOf('@media (prefers-reduced-motion: reduce)'),
    );
    expect(compactRules).not.toMatch(
      /\.workspace-command\s*\{[\s\S]*?padding-inline-start:/,
    );
  });

  it('avoids multiplication syntax in WebView2-facing calc expressions', () => {
    const ownedCss = [
      'components/WorkspaceChrome.css',
      'ui/adapters/uiw-editor.css',
      'ui/components/navigator.css',
      'ui/components/tabs.css',
    ].map(readSource).join('\n');

    expect(ownedCss).not.toMatch(/calc\([^\n]*\*/);
  });

  it('scopes token-derived WebKit and Firefox scrollbars to the workspace', () => {
    const semanticsCss = readSource('ui/tokens/semantics.css');
    const indexCss = readSource('ui/index.css');

    expect(semanticsCss).toMatch(
      /--ui-scrollbar-track:\s*color-mix\([\s\S]*?var\(--ui-bg-shell\)[\s\S]*?var\(--ui-bg-panel\)/,
    );
    expect(semanticsCss).toMatch(
      /--ui-scrollbar-thumb:\s*color-mix\([\s\S]*?var\(--ui-action\)[\s\S]*?var\(--ui-border\)/,
    );
    expect(semanticsCss).toMatch(
      /--ui-scrollbar-thumb-hover:\s*color-mix\([\s\S]*?var\(--ui-action\)[\s\S]*?var\(--ui-border\)/,
    );
    expect(semanticsCss).toContain('--ui-scrollbar-thumb-active: var(--ui-action);');
    expect(indexCss).toContain('scrollbar-color: var(--ui-scrollbar-thumb) var(--ui-scrollbar-track);');
    expect(indexCss).toContain('.workspace-shell *::-webkit-scrollbar-thumb:hover');
    expect(indexCss).not.toMatch(/(^|\n)\s*\*?::?-webkit-scrollbar/);
  });

  it('gives editor and preview panes singular scroll ownership', () => {
    const adapterCss = readSource('ui/adapters/uiw-editor.css');
    const priority = '!'.concat('important');

    expect(adapterCss).toMatch(new RegExp(`\\.w-md-editor-content\\s*\\{[\\s\\S]*?overflow: hidden ${priority};`));
    expect(adapterCss).toMatch(new RegExp(`\\.w-md-editor-area\\s*\\{[\\s\\S]*?overflow: auto ${priority};`));
    expect(adapterCss).toMatch(new RegExp(`\\.w-md-editor-preview\\s*\\{[\\s\\S]*?overflow: auto ${priority};`));
    expect(adapterCss).toMatch(new RegExp(`\\.w-md-editor-text-input\\s*\\{[\\s\\S]*?overflow: hidden ${priority};`));
  });

  it('keeps preset live split ratios authoritative over legacy UIW dimensions', () => {
    const adapterCss = readSource('ui/adapters/uiw-editor.css');
    const priority = '!'.concat('important');

    expect(adapterCss).toMatch(new RegExp(
      `\\[data-view-mode='live'\\] \\.w-md-editor-show-live \\.w-md-editor-area\\s*\\{[\\s\\S]*?`
      + `flex-basis: var\\(--ui-editor-area-basis\\) ${priority};[\\s\\S]*?`
      + `max-width: var\\(--ui-editor-area-basis\\) ${priority};`,
    ));
    expect(adapterCss).toMatch(new RegExp(
      `\\[data-view-mode='live'\\] \\.w-md-editor-show-live \\.w-md-editor-preview\\s*\\{[\\s\\S]*?`
      + `flex-basis: var\\(--ui-editor-preview-basis\\) ${priority};`,
    ));
  });

  it('keeps Operator markers and navigator indexes single-sourced in markup', () => {
    const toolbarSource = readSource('components/Toolbar.jsx');
    const sidebarSource = readSource('components/Sidebar.jsx');
    const panesCss = readSource('ui/components/panes.css');
    const navigatorCss = readSource('ui/components/navigator.css');

    expect(toolbarSource).toContain('className="operator-mark"');
    expect(panesCss).not.toContain('.command-region::before');
    expect(sidebarSource).toContain('className="navigator-index"');
    expect(navigatorCss).not.toContain('.file-item::before');
    expect(navigatorCss).not.toContain('counter-increment: document-index');
  });

  it('truncates navigator, tab, toolbar, and status labels before shell overflow', () => {
    const chromeCss = readSource('components/WorkspaceChrome.css');

    expect(chromeCss).toMatch(/\.restore-workspace span\s*\{[\s\S]*?text-overflow: ellipsis;/);
    expect(chromeCss).toMatch(/\.navigator-row-title\s*\{[\s\S]*?text-overflow: ellipsis;/);
    expect(chromeCss).toMatch(/\.tab-name\s*\{[\s\S]*?text-overflow: ellipsis;/);
    expect(chromeCss).toMatch(/\.current-document\s*\{[\s\S]*?text-overflow: ellipsis;/);
  });

  it('keeps tab scrolling while hiding only its native visual scrollbar', () => {
    const tabsCss = readSource('ui/components/tabs.css');

    expect(tabsCss).toMatch(/\.tab-bar\s*\{[\s\S]*?overflow-x: auto;/);
    expect(tabsCss).toMatch(/\.tab-bar\s*\{[\s\S]*?scrollbar-width: none;/);
    expect(tabsCss).toMatch(/\.tab-bar::-webkit-scrollbar\s*\{[\s\S]*?display: none;/);
    expect(tabsCss).toMatch(/\.tabs-region::after\s*\{[\s\S]*?linear-gradient/);
  });
});
