import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const srcDir = path.join(rootDir, 'src');

function readCssFile(relativePath) {
  const fullPath = path.join(srcDir, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('Responsive Matrix & CSS System Contracts', () => {
  it('enforces 900px, 1200px, and 1600px grid template contracts for all three workspace styles', () => {
    const workbenchCss = readCssFile('ui/layouts/split-workbench.css');
    const focusCanvasCss = readCssFile('ui/layouts/focus-canvas.css');
    const commandProofCss = readCssFile('ui/layouts/command-proof.css');

    // 1200px / 1600px desktop grid contracts
    expect(workbenchCss).toContain("grid-template-columns: 240px 1fr");
    expect(focusCanvasCss).toContain("grid-template-columns: 240px 1fr 240px");
    expect(commandProofCss).toContain("grid-template-columns: 200px 1fr 300px");

    // 900px / narrow media query grid contracts
    expect(focusCanvasCss).toContain("@media (max-width: 900px)");
    expect(focusCanvasCss).toContain("grid-template-columns: 0 1fr 0");

    expect(commandProofCss).toContain("@media (max-width: 900px)");
    expect(commandProofCss).toContain("grid-template-columns: 0 1fr 0");

    expect(workbenchCss).toContain("@media (max-width: 768px)");
    expect(workbenchCss).toContain("grid-template-columns: 0 1fr");
  });

  it('enforces narrow hidden-region collapse rules across layout modules', () => {
    const workbenchCss = readCssFile('ui/layouts/split-workbench.css');
    const focusCanvasCss = readCssFile('ui/layouts/focus-canvas.css');
    const commandProofCss = readCssFile('ui/layouts/command-proof.css');

    // Workbench narrow collapse rules
    expect(workbenchCss).toMatch(/\.navigator-region\s*\{\s*display:\s*none;\s*\}/);
    expect(workbenchCss).toMatch(/\.render-region\s*\{\s*display:\s*none;\s*\}/);

    // Focus Canvas (Reading Room) narrow collapse rules
    expect(focusCanvasCss).toMatch(/\.navigator-region,\s*\n?\s*\.workspace-shell\[data-layout='focus-canvas'\] \.outline-region\s*\{\s*display:\s*none;\s*\}/);

    // Command Proof (Operator) narrow collapse rules
    expect(commandProofCss).toMatch(/\.navigator-region,\s*\n?\s*\.workspace-shell\[data-layout='command-proof'\] \.outline-region\s*\{\s*display:\s*none;\s*\}/);
  });

  it('enforces filename truncation and keyboard focus indicator rules', () => {
    const tabsCss = readCssFile('ui/components/tabs.css');
    const navigatorCss = readCssFile('ui/components/navigator.css');
    const buttonCss = readCssFile('ui/components/button.css');

    // Long filename truncation contracts
    expect(tabsCss).toContain("white-space: nowrap;");
    expect(tabsCss).toContain("overflow: hidden;");
    expect(tabsCss).toContain("text-overflow: ellipsis;");
    expect(tabsCss).toContain("max-width: 200px;");

    expect(navigatorCss).toContain("white-space: nowrap;");
    expect(navigatorCss).toContain("overflow: hidden;");
    expect(navigatorCss).toContain("text-overflow: ellipsis;");

    // Accessible focus state rules
    expect(buttonCss).toContain(":focus-visible");
    expect(buttonCss).toContain("outline: 2px solid var(--ui-accent-color);");

    expect(tabsCss).toContain(":focus-visible");
    expect(tabsCss).toContain("outline: 2px solid var(--ui-accent-color);");

    expect(navigatorCss).toContain(":focus-visible");
    expect(navigatorCss).toContain("outline: 2px solid var(--ui-accent-color);");
  });

  it('enforces reduced-motion Accessibility contracts', () => {
    const buttonCss = readCssFile('ui/components/button.css');

    expect(buttonCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(buttonCss).toContain("transition: none;");
  });

  it('enforces Reading Room Light canonical white tokens, serif rendering, and rail contracts', () => {
    const primitivesCss = readCssFile('ui/tokens/primitives.css');
    const readingLightCss = readCssFile('ui/themes/reading-light.css');
    const focusCanvasCss = readCssFile('ui/layouts/focus-canvas.css');

    // Primitive token values for Reading Room Light canonical design
    expect(primitivesCss).toContain("--color-reading-shell-light: #F4F1E9;");
    expect(primitivesCss).toContain("--color-reading-paper-light: #FFFEFA;");
    expect(primitivesCss).toContain("--color-reading-ink-light: #242824;");
    expect(primitivesCss).toContain("--color-reading-muted-light: #70776F;");
    expect(primitivesCss).toContain("--color-reading-rule-light: #D9D4C8;");
    expect(primitivesCss).toContain("--color-reading-evergreen: #2F665D;");
    expect(primitivesCss).toContain("--color-reading-selected-light: #DCE8E3;");

    // Reading Room theme mapping
    expect(readingLightCss).toContain("--ui-shell-bg: var(--color-reading-shell-light);");
    expect(readingLightCss).toContain("--ui-paper-bg: var(--color-reading-paper-light);");
    expect(readingLightCss).toContain("--ui-text-color: var(--color-reading-ink-light);");
    expect(readingLightCss).toContain("--ui-font-rendering-family: var(--font-serif);");

    // Reading Room centered canvas & rails contract
    expect(focusCanvasCss).toContain("max-width: 800px;");
    expect(focusCanvasCss).toContain("margin: 0 auto;");
    expect(focusCanvasCss).toContain("grid-area: nav;");
    expect(focusCanvasCss).toContain("grid-area: outline;");
  });
});
