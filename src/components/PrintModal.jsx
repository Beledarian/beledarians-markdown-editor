import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import Icon from './Icon';
import './PrintModal.css';

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

const PrintModal = ({ isOpen, onClose, onPrint }) => {
    const [printTheme, setPrintTheme] = useState('light');
    const [removeMargins, setRemoveMargins] = useState(true);
    const [showFooter, setShowFooter] = useState(true);
    const dialogRef = useRef(null);
    const closeDialog = useEffectEvent(() => onClose());

    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        const handleDialogKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDialog();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusable = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!dialogRef.current?.contains(document.activeElement)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleDialogKeyDown);
        const initialFocusTarget = dialogRef.current?.querySelector('[data-autofocus="true"]')
            || dialogRef.current?.querySelector(FOCUSABLE_SELECTOR);
        initialFocusTarget?.focus();

        return () => {
            document.removeEventListener('keydown', handleDialogKeyDown);
            if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePrint = () => {
        onPrint({
            theme: printTheme,
            removeMargins,
            showFooter
        });
        onClose();
    };

    return (
        <div
            className="modal-overlay print-modal-overlay"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className="modal-content print-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="print-options-title"
                ref={dialogRef}
            >
                <div className="modal-header">
                    <h2 id="print-options-title">Print Options</h2>
                    <button type="button" className="close-btn icon-close-btn" onClick={onClose} aria-label="Close print options" data-autofocus="true">
                        <Icon name="close" />
                    </button>
                </div>

                <div className="print-options">
                    <div className="option-group">
                        <h3>Theme</h3>
                        <label className="print-option">
                            <input
                                type="radio"
                                name="printTheme"
                                value="light"
                                checked={printTheme === 'light'}
                                onChange={(e) => setPrintTheme(e.target.value)}
                            />
                            <span>Light Mode</span>
                        </label>

                        <label className="print-option">
                            <input
                                type="radio"
                                name="printTheme"
                                value="dark"
                                checked={printTheme === 'dark'}
                                onChange={(e) => setPrintTheme(e.target.value)}
                            />
                            <span>Dark Mode</span>
                        </label>

                        <label className="print-option">
                            <input
                                type="radio"
                                name="printTheme"
                                value="academic"
                                checked={printTheme === 'academic'}
                                onChange={(e) => setPrintTheme(e.target.value)}
                            />
                            <span>Academic</span>
                        </label>

                        <label className="print-option">
                            <input
                                type="radio"
                                name="printTheme"
                                value="modern"
                                checked={printTheme === 'modern'}
                                onChange={(e) => setPrintTheme(e.target.value)}
                            />
                            <span>Modern</span>
                        </label>
                    </div>

                    <div className="option-group">
                        <h3>Layout</h3>
                        <label className="print-option checkbox-option">
                            <input
                                type="checkbox"
                                checked={removeMargins}
                                onChange={(e) => setRemoveMargins(e.target.checked)}
                            />
                            <span>Remove Borders/Margins</span>
                        </label>

                        <label className="print-option checkbox-option">
                            <input
                                type="checkbox"
                                checked={showFooter}
                                onChange={(e) => setShowFooter(e.target.checked)}
                            />
                            <span>Show "BeledariansMD-Editor" Footer</span>
                        </label>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" onClick={handlePrint}>Print</button>
                </div>
            </div>
        </div>
    );
};

export default PrintModal;
