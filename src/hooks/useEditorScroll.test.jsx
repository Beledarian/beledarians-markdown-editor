import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorScroll } from './useEditorScroll';

const setGeometry = (element, { clientHeight, scrollHeight }) => {
    Object.defineProperties(element, {
        clientHeight: { configurable: true, value: clientHeight },
        scrollHeight: { configurable: true, value: scrollHeight },
    });
};

const installEditor = ({ includeArea = true, includeAnchors = true } = {}) => {
    document.body.innerHTML = `
        <div class="app">
            <div class="w-md-editor">
                ${includeArea ? '<div class="w-md-editor-area">' : ''}
                    <textarea class="w-md-editor-text-input" style="line-height: 20px"></textarea>
                ${includeArea ? '</div>' : ''}
                <div class="w-md-editor-preview">
                    ${includeAnchors ? `
                        <p data-source-line="1">One</p>
                        <p data-source-line="11">Eleven</p>
                        <p data-source-line="21">Twenty-one</p>
                    ` : '<p>Rendered Markdown</p>'}
                </div>
            </div>
        </div>
    `;

    const area = document.querySelector('.w-md-editor-area');
    const input = document.querySelector('.w-md-editor-text-input');
    const preview = document.querySelector('.w-md-editor-preview');
    input.value = Array.from({ length: 21 }, (_, index) => `Line ${index + 1}`).join('\n');
    setGeometry(area || input, { clientHeight: 100, scrollHeight: 500 });
    if (area) setGeometry(input, { clientHeight: 500, scrollHeight: 500 });
    setGeometry(preview, { clientHeight: 100, scrollHeight: 500 });
    return { area, input, preview };
};

describe('useEditorScroll', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 0));
        vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('interpolates preview scrolling continuously between sparse source anchors', () => {
        const { area, input, preview } = installEditor();
        const lines = preview.querySelectorAll('[data-source-line]');
        preview.getBoundingClientRect = () => ({ top: 0 });
        lines[0].getBoundingClientRect = () => ({ top: -100 });
        lines[1].getBoundingClientRect = () => ({ top: 100 });
        lines[2].getBoundingClientRect = () => ({ top: 300 });

        renderHook(() => useEditorScroll('file-a', true));
        act(() => vi.advanceTimersByTime(100));

        preview.scrollTop = 60;
        fireEvent.scroll(preview);
        act(() => vi.advanceTimersByTime(0));

        expect(area.scrollTop).toBe(60);
        expect(input.scrollTop).toBe(0);
    });

    it('interpolates editor scrolling instead of snapping the preview to a heading', () => {
        const { area, preview } = installEditor();
        const lines = preview.querySelectorAll('[data-source-line]');
        preview.getBoundingClientRect = () => ({ top: 0 });
        lines[0].getBoundingClientRect = () => ({ top: 0 });
        lines[1].getBoundingClientRect = () => ({ top: 200 });
        lines[2].getBoundingClientRect = () => ({ top: 400 });

        renderHook(() => useEditorScroll('file-a', true));
        act(() => vi.advanceTimersByTime(100));

        area.scrollTop = 100;
        fireEvent.scroll(area);
        act(() => vi.advanceTimersByTime(0));

        expect(preview.scrollTop).toBe(100);
    });

    it('restores per-file positions on the area scroll owner', () => {
        const { area, preview } = installEditor();
        const { rerender } = renderHook(
            ({ fileId }) => useEditorScroll(fileId, false),
            { initialProps: { fileId: 'file-a' } },
        );
        act(() => vi.advanceTimersByTime(100));

        area.scrollTop = 72;
        preview.scrollTop = 33;
        fireEvent.scroll(area);
        fireEvent.scroll(preview);

        rerender({ fileId: 'file-b' });
        act(() => vi.advanceTimersByTime(100));
        area.scrollTop = 9;
        preview.scrollTop = 11;
        fireEvent.scroll(area);
        fireEvent.scroll(preview);

        rerender({ fileId: 'file-a' });
        act(() => vi.advanceTimersByTime(100));

        expect(area.scrollTop).toBe(72);
        expect(preview.scrollTop).toBe(33);
    });

    it('falls back to the text input when the editor area is unavailable', () => {
        const { input, preview } = installEditor({
            includeArea: false,
            includeAnchors: false,
        });

        renderHook(() => useEditorScroll('file-a', true));
        act(() => vi.advanceTimersByTime(100));

        preview.scrollTop = 40;
        fireEvent.scroll(preview);
        act(() => vi.advanceTimersByTime(0));

        expect(input.scrollTop).toBe(40);
    });
});
