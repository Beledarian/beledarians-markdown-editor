import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const srcDir = path.join(rootDir, 'src');

function readSrcFile(relativePath) {
  const fullPath = path.join(srcDir, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('Math Rendering & Responsive Sidebar Expansion Contracts', () => {
  describe('KaTeX CSS Integration', () => {
    it('imports katex.min.css in main.jsx before UI styles', () => {
      const mainJsx = readSrcFile('main.jsx');
      expect(mainJsx).toContain("import 'katex/dist/katex.min.css'");
      const katexIdx = mainJsx.indexOf("import 'katex/dist/katex.min.css'");
      const appIdx = mainJsx.indexOf("import App from './App.jsx'");
      expect(katexIdx).toBeGreaterThanOrEqual(0);
      expect(katexIdx).toBeLessThan(appIdx);
    });

    it('verifies katex CSS distribution file exists and defines .katex-mathml clipping', () => {
      const katexCssPath = path.join(rootDir, 'node_modules/katex/dist/katex.min.css');
      expect(fs.existsSync(katexCssPath)).toBe(true);
      const katexCss = fs.readFileSync(katexCssPath, 'utf-8');
      expect(katexCss).toContain('.katex-mathml');
      expect(katexCss).toContain('clip-path:inset(50%)');
      expect(katexCss).toContain('.frac-line');
    });
  });

  describe('Non-Fullscreen / Narrow Viewport Sidebar Expansion Contracts', () => {
    it('enforces that split-workbench allows navigator expansion when data-navigator-open is true at <= 900px', () => {
      const workbenchCss = readSrcFile('ui/layouts/split-workbench.css');
      expect(workbenchCss).toContain("@media (max-width: 900px)");
      expect(workbenchCss).toMatch(
        /\.workspace-shell\[data-layout='split-workbench'\]\[data-navigator-open='true'\]\s*\{\s*grid-template-columns:\s*var\(--ui-activity-width\)\s*var\(--ui-navigator-width\)\s*minmax\(0,\s*1fr\);/
      );
      expect(workbenchCss).toMatch(
        /\.workspace-shell\[data-layout='split-workbench'\]\[data-navigator-open='true'\]\s*\.navigator-region\s*\{\s*display:\s*block;\s*\}/
      );
    });

    it('enforces that focus-canvas allows navigator expansion when data-navigator-open is true at <= 900px', () => {
      const focusCanvasCss = readSrcFile('ui/layouts/focus-canvas.css');
      expect(focusCanvasCss).toContain("@media (max-width: 900px)");
      expect(focusCanvasCss).toMatch(
        /\.workspace-shell\[data-layout='focus-canvas'\]\[data-navigator-open='true'\]\s*\{\s*grid-template-columns:\s*var\(--ui-navigator-width\)\s*minmax\(0,\s*1fr\);/
      );
      expect(focusCanvasCss).toMatch(
        /\.workspace-shell\[data-layout='focus-canvas'\]\[data-navigator-open='true'\]\s*\.navigator-region\s*\{\s*display:\s*block;\s*\}/
      );
    });

    it('enforces that command-proof allows navigator expansion when data-navigator-open is true at <= 900px', () => {
      const commandProofCss = readSrcFile('ui/layouts/command-proof.css');
      expect(commandProofCss).toContain("@media (max-width: 900px)");
      expect(commandProofCss).toMatch(
        /\.workspace-shell\[data-layout='command-proof'\]\[data-navigator-open='true'\]\s*\{\s*grid-template-columns:\s*minmax\(var\(--ui-navigator-width\),\s*0\.27fr\)\s*minmax\(0,\s*1fr\);/
      );
      expect(commandProofCss).toMatch(
        /\.workspace-shell\[data-layout='command-proof'\]\[data-navigator-open='true'\]\s*\.navigator-region\s*\{\s*display:\s*block;\s*\}/
      );
      expect(commandProofCss).toMatch(
        /\.workspace-shell\[data-layout='command-proof'\]\[data-navigator-open='true'\]\s*\.tabs-region,\s*\n?\s*\.workspace-shell\[data-layout='command-proof'\]\[data-navigator-open='true'\]\s*\.workspace-region\s*\{\s*grid-column:\s*2;\s*\}/
      );
    });
  });
});
