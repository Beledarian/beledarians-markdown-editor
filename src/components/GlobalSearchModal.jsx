import React, {
    useState, useEffect, useEffectEvent, useRef, useCallback,
} from 'react';
import Icon from './Icon';

const GlobalSearchModal = ({ isOpen, onClose, files, onFileSelect, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef(null);
    const dialogRef = useRef(null);
    // Monotonic counter — each new search increments it; stale searches bail out
    const searchIdRef = useRef(0);

    const closeDialog = useEffectEvent(() => onClose());

    // Reset, focus, trap keyboard navigation, and restore the invoking control.
    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        const focusTimer = setTimeout(() => {
            setQuery('');
            setResults([]);
            inputRef.current?.focus();
        }, 0);
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDialog();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusable = Array.from(dialogRef.current?.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ) || []);
            if (focusable.length === 0) {
                event.preventDefault();
                dialogRef.current?.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
            // Restore after React removes the dialog so its disappearing focused
            // descendant cannot hand focus back to the document body.
            setTimeout(() => {
                if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
                    previouslyFocused.focus();
                }
            }, 0);
        };
    }, [isOpen]);

    // Debounced search — waits 300 ms after last keystroke before hitting disk
    useEffect(() => {
        const searchId = ++searchIdRef.current;
        // Use 0ms delay to clear quickly; 300ms delay to debounce actual searches
        const delay = query.length < 2 ? 0 : 300;

        const timer = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            const newResults = [];

            try {
                for (const file of files) {
                    if (searchId !== searchIdRef.current) return; // newer search started
                    if (!file.handle) continue;
                    try {
                        const fileObj = await file.handle.getFile();
                        const text = await fileObj.text();
                        if (text.toLowerCase().includes(query.toLowerCase())) {
                            const index = text.toLowerCase().indexOf(query.toLowerCase());
                            const start = Math.max(0, index - 40);
                            const end = Math.min(text.length, index + query.length + 40);
                            let snippet = text.substring(start, end);
                            if (start > 0) snippet = '...' + snippet;
                            if (end < text.length) snippet = snippet + '...';

                            // Compute line number of the match for navigation
                            const lineNum = text.substring(0, index).split('\n').length;
                            newResults.push({
                                name: file.name,
                                path: file.path,
                                handle: file.handle,
                                snippet,
                                matchLine: lineNum,
                                matchText: text.substring(index, index + query.length)
                            });
                        }
                    } catch {
                        // Skip files with stale/revoked handles
                    }
                }
            } catch (err) {
                if (searchId !== searchIdRef.current) return;
                console.error("Search failed", err);
            }

            if (searchId === searchIdRef.current) {
                setResults(newResults);
                setIsSearching(false);
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [query, files]);

    // Handle result click: open file then navigate to the match
    const handleResultClick = useCallback((res) => {
        const capturedLine = res.matchLine;

        onFileSelect(res);
        onClose();

        // Navigate after a delay to allow the file to load and the editor to render.
        // We try at 400 ms (covers already-open files / fast loads) and retry at
        // 1200 ms to cover slower async reads from disk.
        const navigate = () => {
            if (!onNavigate) return;
            if (capturedLine) {
                onNavigate({ line: capturedLine });
            }
        };
        setTimeout(navigate, 400);
        setTimeout(navigate, 1200);
    }, [onFileSelect, onClose, onNavigate]);

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                className="search-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="global-search-title"
                tabIndex={-1}
            >
                <div className="modal-header">
                    <h3 id="global-search-title">Global Search</h3>
                    <button type="button" className="close-btn icon-close-btn" onClick={onClose} aria-label="Close global search">
                        <Icon name="close" />
                    </button>
                </div>
                <div className="search-input-container">
                    <label className="visually-hidden" htmlFor="global-search-input">Search all files</label>
                    <input
                        ref={inputRef}
                        id="global-search-input"
                        type="text"
                        placeholder="Search in all files..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    {isSearching && <div className="spinner" role="status" aria-label="Searching files" />}
                </div>
                <div className="search-results" aria-live="polite">
                    {results.length > 0 ? (
                        results.map((res) => (
                            <button
                                key={res.path}
                                type="button"
                                className="search-result-item"
                                onClick={() => handleResultClick(res)}
                            >
                                <div className="result-filename">{res.name} <span className="result-line">line {res.matchLine}</span></div>
                                <div className="result-snippet">{res.snippet}</div>
                            </button>
                        ))
                    ) : (
                        query.length >= 2 && !isSearching && <div className="no-results" role="status">No matches found</div>
                    )}
                </div>
            </div>
            <style>{`
                .search-modal {
                    background: var(--ui-bg-panel);
                    color: var(--ui-text);
                    width: min(90vw, 600px);
                    max-height: 80vh;
                    border-radius: var(--ui-radius-control);
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--ui-modal-shadow);
                    border: var(--ui-hairline) solid var(--ui-border);
                }
                .search-input-container {
                    padding: var(--ui-space-6);
                    position: relative;
                }
                .search-input-container input {
                    width: 100%;
                    min-height: var(--ui-control-height);
                    padding: 0 var(--ui-space-4);
                    background: var(--ui-bg-input);
                    color: var(--ui-text);
                    border: var(--ui-hairline) solid var(--ui-border-input);
                    border-radius: var(--ui-radius-control);
                    font-size: var(--ui-font-size-md);
                    box-sizing: border-box;
                }
                .search-input-container input:focus-visible {
                    outline: var(--ui-focus-ring-width) solid var(--ui-focus);
                    outline-offset: var(--ui-focus-ring-offset);
                }
                .search-results {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 var(--ui-space-3) var(--ui-space-6);
                }
                .search-result-item {
                    display: block;
                    width: 100%;
                    padding: var(--ui-space-4);
                    margin-bottom: var(--ui-space-2);
                    border-radius: var(--ui-radius-control);
                    cursor: pointer;
                    background: var(--ui-bg-raised);
                    border: var(--ui-hairline) solid transparent;
                    color: var(--ui-text);
                    font: inherit;
                    text-align: left;
                    transition: border-color var(--ui-motion-fast) var(--ui-motion-ease);
                }
                .search-result-item:hover,
                .search-result-item:focus-visible {
                    border-color: var(--ui-action);
                    background: var(--ui-selection);
                }
                .search-result-item:focus-visible {
                    outline: var(--ui-focus-ring-width) solid var(--ui-focus);
                    outline-offset: var(--ui-focus-ring-offset);
                }
                .result-filename {
                    font-weight: var(--ui-font-weight-selected);
                    margin-bottom: var(--ui-space-1);
                    display: flex;
                    align-items: center;
                    gap: var(--ui-space-2);
                }
                .result-line {
                    font-size: var(--ui-font-size-xs);
                    font-weight: normal;
                    color: var(--ui-text-subtle);
                    font-family: var(--ui-font-source);
                }
                .result-snippet {
                    color: var(--ui-text-muted);
                    font-size: var(--ui-font-size-sm);
                    font-family: var(--ui-font-source);
                    white-space: pre-wrap;
                }
                .no-results {
                    text-align: center;
                    padding: var(--ui-space-6);
                    color: var(--ui-text-subtle);
                }
                .spinner {
                    position: absolute;
                    right: var(--ui-space-8);
                    top: var(--ui-space-8);
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--ui-border);
                    border-top-color: var(--ui-action);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .spinner { animation: none; }
                    .search-result-item { transition: none; }
                }
            `}</style>
        </div>
    );
};

export default GlobalSearchModal;
