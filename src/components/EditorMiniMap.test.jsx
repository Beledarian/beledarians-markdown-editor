import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditorMiniMap from './EditorMiniMap';

const setGeometry = (element, { clientHeight, scrollHeight, scrollTop }) => {
    Object.defineProperties(element, {
        clientHeight: { configurable: true, value: clientHeight },
        scrollHeight: { configurable: true, value: scrollHeight },
    });
    element.scrollTop = scrollTop;
};

const installEditor = ({ includeArea = true } = {}) => {
    const host = document.createElement('div');
    host.className = 'app';
    host.innerHTML = `
        <div class="w-md-editor">
            ${includeArea ? '<div class="w-md-editor-area">' : ''}
                <textarea class="w-md-editor-text-input"></textarea>
            ${includeArea ? '</div>' : ''}
        </div>
    `;
    document.body.appendChild(host);

    const area = host.querySelector('.w-md-editor-area');
    const input = host.querySelector('.w-md-editor-text-input');
    setGeometry(area || input, { clientHeight: 100, scrollHeight: 400, scrollTop: 300 });
    if (area) {
        setGeometry(input, { clientHeight: 400, scrollHeight: 400, scrollTop: 0 });
    }
    return { area, input };
};

describe('EditorMiniMap', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.useRealTimers();
    });

    it('tracks the editor area and keeps the indicator contained at the scroll end', () => {
        const { area, input } = installEditor();
        const { container } = render(<EditorMiniMap text={'one\ntwo\nthree'} />);
        const minimap = container.querySelector('.editor-mini-map');
        const indicator = container.querySelector('.mini-map-indicator');

        expect(minimap).toHaveClass('editor-mini-map');
        expect(indicator).toHaveStyle({ height: '25%', top: '75%' });

        area.scrollTop = 150;
        fireEvent.scroll(area);
        expect(indicator).toHaveStyle({ top: '37.5%' });
        expect(input.scrollTop).toBe(0);
    });

    it('clamps overscroll so the viewport indicator cannot escape the minimap', () => {
        const { area } = installEditor();
        area.scrollTop = 999;
        const { container } = render(<EditorMiniMap text="content" />);
        const indicator = container.querySelector('.mini-map-indicator');

        const top = parseFloat(indicator.style.top);
        const height = parseFloat(indicator.style.height);
        expect(top + height).toBe(100);
    });

    it('falls back to the text input when no editor area exists', () => {
        const { input } = installEditor({ includeArea: false });
        const { container } = render(<EditorMiniMap text="content" />);
        const indicator = container.querySelector('.mini-map-indicator');

        expect(indicator).toHaveStyle({ top: '75%' });
        input.scrollTop = 150;
        fireEvent.scroll(input);
        expect(indicator).toHaveStyle({ top: '37.5%' });

        act(() => vi.advanceTimersByTime(100));
    });

    it('provides a positioned containment block for the viewport indicator', () => {
        const css = readFileSync(resolve(cwd(), 'src/components/EditorMiniMap.css'), 'utf8');

        expect(css).toMatch(/\.editor-mini-map\s*\{[\s\S]*?position:\s*relative;/);
        expect(css).toMatch(/\.editor-mini-map\s*\{[\s\S]*?overflow:\s*hidden;/);
    });
});
