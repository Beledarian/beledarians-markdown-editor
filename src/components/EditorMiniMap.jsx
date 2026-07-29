import React, { useEffect, useState, useCallback, useRef } from 'react';
import './EditorMiniMap.css';

const EditorMiniMap = ({ text }) => {
    const [mapState, setMapState] = useState({ topPct: 0, heightPct: 100 });
    const setMapStateRef = useRef(setMapState);

    const getEditorScrollOwner = useCallback(() => (
        document.querySelector('.w-md-editor-area')
        || document.querySelector('.w-md-editor-text-input')
    ), []);

    // Stable update function that reads current editor geometry
    const update = useCallback(() => {
        const editor = getEditorScrollOwner();
        if (!editor) {
            setMapStateRef.current({ topPct: 0, heightPct: 100 });
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = editor;
        if (scrollHeight === 0) return;

        const hPct = Math.min(Math.max((clientHeight / scrollHeight) * 100, 0), 100);
        const maxScrollTop = Math.max(scrollHeight - clientHeight, 0);
        const scrollProgress = maxScrollTop > 0
            ? Math.min(Math.max(scrollTop / maxScrollTop, 0), 1)
            : 0;
        const tPct = scrollProgress * (100 - hPct);
        setMapStateRef.current({ topPct: tPct, heightPct: hPct });
    }, [getEditorScrollOwner]);

    // Bind to the real scroll owner, including when the editor remounts.
    useEffect(() => {
        let boundEditor = null;
        const bindScrollOwner = () => {
            const editor = getEditorScrollOwner();
            if (editor !== boundEditor) {
                boundEditor?.removeEventListener('scroll', update);
                boundEditor = editor;
                boundEditor?.addEventListener('scroll', update);
            }
            update();
        };

        bindScrollOwner();
        window.addEventListener('resize', update);

        const editorContainer = document.querySelector('.w-md-editor') || document.querySelector('.app');
        const observer = editorContainer ? new MutationObserver(bindScrollOwner) : null;
        observer?.observe(editorContainer, { childList: true, subtree: true });
        const setupTimer = setTimeout(bindScrollOwner, 100);

        return () => {
            clearTimeout(setupTimer);
            observer?.disconnect();
            boundEditor?.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [getEditorScrollOwner, update]);

    // Recalculate layout after content changes (height may have grown/shrunk)
    useEffect(() => {
        const timer = setTimeout(update, 100);
        return () => clearTimeout(timer);
    }, [text, update]);

    // Don't show indicator if content fits perfectly (heightPct >= 100)
    // The previous issue was the indicator (green box) covering everything when hPct was 100.
    const showIndicator = mapState.heightPct < 100;

    if (!text) return null;

    return (
        <div className="editor-mini-map" aria-hidden="true">
            <div className="mini-map-text">{text}</div>
            {showIndicator && (
                <div className="mini-map-indicator" style={{
                    top: `${mapState.topPct}%`,
                    height: `${mapState.heightPct}%`
                }} />
            )}
        </div>
    );
};

export default EditorMiniMap;
