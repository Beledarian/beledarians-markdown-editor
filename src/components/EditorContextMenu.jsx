import React, { useEffect, useRef } from 'react';
import './ContextMenus.css';

const EditorContextMenu = ({ x, y, onClose, onCut, onCopy, onPaste, onSelectAll }) => {
    const menuRef = useRef(null);
    const editorFocusRef = useRef(null);

    useEffect(() => {
        editorFocusRef.current = document.activeElement;
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                editorFocusRef.current?.focus();
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        menuRef.current?.querySelector('[role="menuitem"]')?.focus();
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const menuWidth = 150;
    const menuHeight = 160;
    let finalX = x;
    let finalY = y;

    if (x + menuWidth > window.innerWidth) finalX = x - menuWidth;
    if (y + menuHeight > window.innerHeight) finalY = y - menuHeight;

    const runEditorAction = (action) => {
        editorFocusRef.current?.focus();
        action();
    };

    const handleMenuKeyDown = (event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || []);
        if (items.length === 0) return;
        const currentIndex = items.indexOf(document.activeElement);
        const nextIndex = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? items.length - 1
                : event.key === 'ArrowDown'
                    ? (currentIndex + 1) % items.length
                    : (currentIndex - 1 + items.length) % items.length;
        items[nextIndex].focus();
    };

    return (
        <div
            ref={menuRef}
            className="context-menu editor-context-menu"
            role="menu"
            aria-label="Editor actions"
            onKeyDown={handleMenuKeyDown}
            style={{ top: finalY, left: finalX }}
        >
            <button type="button" role="menuitem" onClick={() => runEditorAction(onCut)}>
                <span>Cut</span><span className="shortcut">Ctrl+X</span>
            </button>
            <button type="button" role="menuitem" onClick={() => runEditorAction(onCopy)}>
                <span>Copy</span><span className="shortcut">Ctrl+C</span>
            </button>
            <button type="button" role="menuitem" onClick={() => runEditorAction(onPaste)}>
                <span>Paste</span><span className="shortcut">Ctrl+V</span>
            </button>
            <div className="editor-context-menu__separator" role="separator" />
            <button type="button" role="menuitem" onClick={() => runEditorAction(onSelectAll)}>
                <span>Select All</span><span className="shortcut">Ctrl+A</span>
            </button>

            <style>{`
                .editor-context-menu > button {
                    justify-content: space-between;
                }
                .editor-context-menu__separator {
                    height: var(--ui-hairline);
                    margin: var(--ui-space-1) 0;
                    background: var(--ui-border);
                }
                .editor-context-menu .shortcut {
                    color: var(--ui-text-subtle);
                    font-family: var(--ui-font-source);
                    font-size: var(--ui-font-size-xs);
                }
            `}</style>
        </div>
    );
};

export default EditorContextMenu;
