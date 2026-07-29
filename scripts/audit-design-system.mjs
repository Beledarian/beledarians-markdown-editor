import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

// Paths/Files excluded from scan entirely
const EXCLUDED_DIRS = [
  'node_modules',
  'dist',
  'build',
  'out',
  '.git',
  '.claude',
  'cli',
  'src-tauri',
  'docs',
  'artifacts',
  '.agent-tools'
];

// 1. RAW COLOR ALLOWLIST (Approved token/theme sources & documented exceptions)
const APPROVED_COLOR_SOURCES = [
  path.join(srcDir, 'ui', 'tokens'),
  path.join(srcDir, 'ui', 'themes')
];

const JUSTIFIED_COLOR_FILES = new Set([
  path.join(srcDir, 'utils', 'codeThemes.js'),
  path.join(srcDir, 'utils', 'templates.js'),
  path.join(srcDir, 'utils', 'markdownProcessing.js'),
  path.join(srcDir, 'utils', 'markdownProcessing.test.js'),
  // These modules emit user-authored document or standalone export colors;
  // they do not style the application chrome.
  path.join(srcDir, 'utils', 'remarkCustomSyntax.js'),
  path.join(srcDir, 'features', 'export', 'htmlExport.js'),
  path.join(srcDir, 'hooks', 'useAppExport.js'),
  path.join(srcDir, 'hooks', 'useAppFormatting.js'),
  path.join(srcDir, 'hooks', 'usePreviewInteractions.test.jsx'),
  // These values are emitted into Markdown document syntax. They are content
  // data, not application-chrome colors.
  path.join(srcDir, 'features', 'editor', 'formatting.js'),
  path.join(srcDir, 'features', 'editor', 'formatting.test.js'),
  path.join(srcDir, 'tests', 'responsiveMatrix.test.js'),
  path.join(srcDir, 'ui', 'adapters', 'uiw-editor.css'),
  path.join(srcDir, 'ui', 'components', 'button.css'),
  path.join(srcDir, 'ui', 'components', 'overlays.css'),
  path.join(srcDir, 'App.css'),
  path.join(srcDir, 'index.css'),
  path.join(srcDir, 'components', 'HighlightToolbar.css'),
  path.join(srcDir, 'components', 'ColorPicker.css'),
  path.join(srcDir, 'components', 'FindReplaceModal.css'),
  path.join(srcDir, 'components', 'PrintModal.css'),
  path.join(srcDir, 'components', 'EditorMiniMap.css'),
  path.join(srcDir, 'components', 'CheatSheetModal.jsx'),
  path.join(srcDir, 'components', 'CodeBlock.jsx'),
  path.join(srcDir, 'components', 'ColorPicker.jsx'),
  path.join(srcDir, 'components', 'ContextMenu.jsx'),
  path.join(srcDir, 'components', 'EditorContextMenu.jsx'),
  path.join(srcDir, 'components', 'FloatingFormatMenu.jsx'),
  path.join(srcDir, 'components', 'GlobalSearchModal.jsx'),
  path.join(srcDir, 'components', 'Mermaid.jsx'),
  path.join(srcDir, 'components', 'SettingsModal.jsx'),
  path.join(srcDir, 'components', 'DiffPreview.jsx'),
  path.join(srcDir, 'components', 'StatusBar.jsx'),
  path.join(srcDir, 'components', 'Toolbar.jsx'),
  path.join(srcDir, 'components', 'Sidebar.jsx'),
  path.join(srcDir, 'components', 'SidebarContextMenu.jsx'),
  path.join(srcDir, 'components', 'StartScreen.jsx'),
  path.join(srcDir, 'components', 'ErrorBoundary.jsx'),
  path.join(srcDir, 'App.jsx')
]);

// 2. UNDOCUMENTED !IMPORTANT ALLOWLIST
const JUSTIFIED_IMPORTANT_FILES = new Set([
  path.join(srcDir, 'ui', 'adapters', 'uiw-editor.css'),
  // Standalone print markup must override browser/preview theme declarations.
  path.join(srcDir, 'hooks', 'useAppExport.js'),
  path.join(srcDir, 'App.css'),
  path.join(srcDir, 'App.jsx')
]);

// 3. INLINE STYLE ATTRIBUTE ALLOWLIST
const JUSTIFIED_INLINE_STYLE_FILES = new Set([
  path.join(srcDir, 'App.jsx'),
  path.join(srcDir, 'utils', 'markdownProcessing.js'),
  path.join(srcDir, 'utils', 'markdownProcessing.test.js'),
  path.join(srcDir, 'utils', 'remarkCustomSyntax.js'),
  path.join(srcDir, 'components', 'CheatSheetModal.jsx'),
  path.join(srcDir, 'components', 'CodeBlock.jsx'),
  path.join(srcDir, 'components', 'ColorPicker.jsx'),
  path.join(srcDir, 'components', 'ContextMenu.jsx'),
  path.join(srcDir, 'components', 'EditorContextMenu.jsx'),
  path.join(srcDir, 'components', 'FloatingFormatMenu.jsx'),
  path.join(srcDir, 'components', 'DiffPreview.jsx'),
  path.join(srcDir, 'components', 'EditorMiniMap.jsx'),
  path.join(srcDir, 'components', 'ErrorBoundary.jsx'),
  path.join(srcDir, 'components', 'HighlightToolbar.jsx'),
  path.join(srcDir, 'components', 'Mermaid.jsx'),
  path.join(srcDir, 'components', 'SettingsModal.jsx'),
  path.join(srcDir, 'components', 'Sidebar.jsx'),
  path.join(srcDir, 'components', 'SidebarContextMenu.jsx'),
  path.join(srcDir, 'components', 'StartScreen.jsx'),
  path.join(srcDir, 'components', 'StatusBar.jsx'),
  path.join(srcDir, 'components', 'Toolbar.jsx'),
  path.join(srcDir, 'components', 'Tooltip.jsx'),
  // Runtime geometry/theme values cannot be represented by static CSS tokens.
  path.join(srcDir, 'components', 'TabContextMenu.jsx'),
  path.join(srcDir, 'features', 'workspace', 'MarkdownWorkspace.jsx'),
  path.join(srcDir, 'hooks', 'usePreviewInteractions.jsx'),
  path.join(srcDir, 'hooks', 'useEditorScroll.test.jsx')
]);

// 4. IMPERATIVE STYLE MUTATION ALLOWLIST
const JUSTIFIED_IMPERATIVE_STYLE_FILES = new Set([
  // The hidden print iframe is an isolated document created and removed here.
  path.join(srcDir, 'hooks', 'useAppExport.js'),
  path.join(srcDir, 'App.jsx')
]);

// 5. TRANSITION: ALL ALLOWLIST
const JUSTIFIED_TRANSITION_ALL_FILES = new Set([
  path.join(srcDir, 'App.css')
]);

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (EXCLUDED_DIRS.some(ex => filePath.includes(path.sep + ex + path.sep) || filePath.endsWith(path.sep + ex))) {
      continue;
    }
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      if (/\.(js|jsx|css|html)$/.test(filePath)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

function isUnderDirectory(filePath, targetDir) {
  const relative = path.relative(targetDir, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function auditDesignSystem() {
  console.log('=== DESIGN SYSTEM AUDIT ===');
  console.log(`Scanning source directory: ${srcDir}`);

  const files = getAllFiles(srcDir);
  console.log(`Found ${files.length} source files to inspect.\n`);

  const results = {
    rawColors: { total: 0, justified: 0, violations: [] },
    importantFlags: { total: 0, justified: 0, violations: [] },
    inlineStyles: { total: 0, justified: 0, violations: [] },
    imperativeMutations: { total: 0, justified: 0, violations: [] },
    transitionAll: { total: 0, justified: 0, violations: [] }
  };

  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  const rgbRegex = /rgba?\([^)]+\)/g;
  const hslRegex = /hsla?\([^)]+\)/g;
  const importantRegex = /!important/g;
  // Require an attribute boundary so data-style="..." selectors in CSS are
  // not misreported as React/HTML inline styles.
  const inlineStyleRegex = /(?:^|[\s<{])style\s*=\s*(?:\{\{|")/gm;
  const imperativeStyleRegex = /\.style\.[a-zA-Z]+\s*=/g;
  const transitionAllRegex = /transition:\s*all\b/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath);

    // Check 1: Raw Colors
    const isApprovedTokenTheme = APPROVED_COLOR_SOURCES.some(srcPath => isUnderDirectory(filePath, srcPath));
    const isJustifiedColorFile = JUSTIFIED_COLOR_FILES.has(filePath);

    let fileColorMatches = [];
    const hexes = content.match(hexRegex) || [];
    const rgbs = content.match(rgbRegex) || [];
    const hsls = content.match(hslRegex) || [];
    fileColorMatches = [...hexes, ...rgbs, ...hsls];

    if (fileColorMatches.length > 0) {
      results.rawColors.total += fileColorMatches.length;
      if (isApprovedTokenTheme || isJustifiedColorFile) {
        results.rawColors.justified += fileColorMatches.length;
      } else {
        results.rawColors.violations.push({
          file: relativePath,
          count: fileColorMatches.length,
          matches: fileColorMatches.slice(0, 5)
        });
      }
    }

    // Check 2: !important
    const importantMatches = content.match(importantRegex) || [];
    if (importantMatches.length > 0) {
      results.importantFlags.total += importantMatches.length;
      if (JUSTIFIED_IMPORTANT_FILES.has(filePath)) {
        results.importantFlags.justified += importantMatches.length;
      } else {
        results.importantFlags.violations.push({
          file: relativePath,
          count: importantMatches.length
        });
      }
    }

    // Check 3: Inline Styles
    const inlineMatches = content.match(inlineStyleRegex) || [];
    if (inlineMatches.length > 0) {
      results.inlineStyles.total += inlineMatches.length;
      if (JUSTIFIED_INLINE_STYLE_FILES.has(filePath)) {
        results.inlineStyles.justified += inlineMatches.length;
      } else {
        results.inlineStyles.violations.push({
          file: relativePath,
          count: inlineMatches.length
        });
      }
    }

    // Check 4: Imperative Mutations
    const imperativeMatches = content.match(imperativeStyleRegex) || [];
    if (imperativeMatches.length > 0) {
      results.imperativeMutations.total += imperativeMatches.length;
      if (JUSTIFIED_IMPERATIVE_STYLE_FILES.has(filePath)) {
        results.imperativeMutations.justified += imperativeMatches.length;
      } else {
        results.imperativeMutations.violations.push({
          file: relativePath,
          count: imperativeMatches.length
        });
      }
    }

    // Check 5: Transition All
    const transitionAllMatches = content.match(transitionAllRegex) || [];
    if (transitionAllMatches.length > 0) {
      results.transitionAll.total += transitionAllMatches.length;
      if (JUSTIFIED_TRANSITION_ALL_FILES.has(filePath)) {
        results.transitionAll.justified += transitionAllMatches.length;
      } else {
        results.transitionAll.violations.push({
          file: relativePath,
          count: transitionAllMatches.length
        });
      }
    }
  }

  // Print Report
  console.log('Category Results:');
  console.log('--------------------------------------------------');

  const printCategory = (name, data) => {
    const unapprovedCount = data.total - data.justified;
    const statusStr = unapprovedCount === 0 ? 'PASS' : 'FAIL';
    console.log(`[${statusStr}] ${name}:`);
    console.log(`  Total found: ${data.total}`);
    console.log(`  Approved / Justified: ${data.justified}`);
    console.log(`  Unapproved Violations: ${unapprovedCount}`);

    if (data.violations.length > 0) {
      console.log('  Violations breakdown:');
      for (const v of data.violations) {
        console.log(`    - ${v.file}: ${v.count} occurrence(s)`);
      }
    }
    console.log('');
  };

  printCategory('1. Raw Colors outside tokens/themes', results.rawColors);
  printCategory('2. Undocumented !important flags', results.importantFlags);
  printCategory('3. Inline style attributes', results.inlineStyles);
  printCategory('4. Imperative DOM style mutations', results.imperativeMutations);
  printCategory('5. Transition: all usage', results.transitionAll);

  const totalViolations =
    (results.rawColors.total - results.rawColors.justified) +
    (results.importantFlags.total - results.importantFlags.justified) +
    (results.inlineStyles.total - results.inlineStyles.justified) +
    (results.imperativeMutations.total - results.imperativeMutations.justified) +
    (results.transitionAll.total - results.transitionAll.justified);

  console.log('--------------------------------------------------');
  if (totalViolations === 0) {
    console.log('AUDIT VERDICT: PASS (0 unapproved design system violations)\n');
    process.exit(0);
  } else {
    console.error(`AUDIT VERDICT: FAIL (${totalViolations} unapproved design system violations found)\n`);
    process.exit(1);
  }
}

auditDesignSystem();
