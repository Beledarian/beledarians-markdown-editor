import { useEffect, useEffectEvent, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { themeNames, themes } from '../utils/codeThemes';
import Icon from './Icon';
import './ThemeExplorer.css';

const WORKSPACE_STYLES = [
    {
        value: 'workbench',
        name: 'Workbench',
        description: 'Compact source and render split',
        reference: 'Dark reference',
    },
    {
        value: 'reading',
        name: 'Reading Room',
        description: 'Editorial page with shelf and outline',
        reference: 'Light reference',
    },
    {
        value: 'operator',
        name: 'Operator',
        description: 'Dense command and proof layout',
        reference: 'Dark reference',
    },
];

const COLOR_MODES = [
    { value: 'light', name: 'Light' },
    { value: 'dark', name: 'Dark' },
];

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

const getTabbableElements = (container) => {
    const candidates = Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
    const radioTabStops = new Map();

    for (const element of candidates) {
        if (!element.matches('input[type="radio"]') || !element.name) continue;
        if (!radioTabStops.has(element.name) || element.checked) {
            radioTabStops.set(element.name, element);
        }
    }

    return candidates.filter((element) => (
        !element.matches('input[type="radio"]')
        || !element.name
        || radioTabStops.get(element.name) === element
    ));
};

const StylePreview = ({ style }) => (
    <span className={`appearance-preview appearance-preview--${style}`} aria-hidden="true">
        <span className="appearance-preview__header" />
        <span className="appearance-preview__nav" />
        <span className="appearance-preview__source" />
        <span className="appearance-preview__render" />
    </span>
);

export const AppearanceSelector = ({
    workspaceStyle = 'workbench',
    colorMode = 'dark',
    onWorkspaceStyleChange,
    onColorModeChange,
    idPrefix = 'appearance',
}) => {
    const selectedStyle = WORKSPACE_STYLES.find(({ value }) => value === workspaceStyle) || WORKSPACE_STYLES[0];
    // Roving-tabindex fallback: when nothing matches, the FIRST option becomes
    // the single tab stop so keyboard users can still enter the group (ARIA
    // radiogroup pattern). `checked` uses the raw colorMode, so this only
    // affects the tab stop, never the visual selection.
    const selectedMode = COLOR_MODES.find(({ value }) => value === colorMode) || COLOR_MODES[0];
    const isReadingRoomLight = selectedStyle.value === 'reading' && selectedMode.value === 'light';

    return (
        <div className="appearance-selector">
            {onWorkspaceStyleChange && (
                <fieldset className="appearance-fieldset">
                    <legend>Workspace style</legend>
                    <p className="appearance-help">Choose how the editor, navigation, and preview share the workspace.</p>
                    <div className="appearance-style-options">
                        {WORKSPACE_STYLES.map((style) => (
                            <label
                                className="appearance-style-option"
                                key={style.value}
                                data-selected={workspaceStyle === style.value}
                            >
                                <input
                                    type="radio"
                                    name={`${idPrefix}-workspace-style`}
                                    value={style.value}
                                    checked={workspaceStyle === style.value}
                                    tabIndex={style.value === selectedStyle.value ? 0 : -1}
                                    onChange={() => onWorkspaceStyleChange(style.value)}
                                    data-autofocus={workspaceStyle === style.value ? 'true' : undefined}
                                />
                                <StylePreview style={style.value} />
                                <span className="appearance-option-copy">
                                    <span className="appearance-option-heading">
                                        <strong>{style.name}</strong>
                                        <span>{style.reference}</span>
                                    </span>
                                    <small>{style.description}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {onColorModeChange && (
                <fieldset className="appearance-fieldset appearance-mode-fieldset">
                    <legend>Color mode</legend>
                    <p className="appearance-help">Light and Dark are available independently for every workspace style.</p>
                    <div className="appearance-mode-options">
                        {COLOR_MODES.map((mode) => (
                            <label
                                className="appearance-mode-option"
                                key={mode.value}
                                data-selected={colorMode === mode.value}
                            >
                                <input
                                    type="radio"
                                    name={`${idPrefix}-color-mode`}
                                    value={mode.value}
                                    checked={colorMode === mode.value}
                                    tabIndex={mode.value === selectedMode.value ? 0 : -1}
                                    onChange={() => onColorModeChange(mode.value)}
                                    data-autofocus={!onWorkspaceStyleChange && colorMode === mode.value ? 'true' : undefined}
                                />
                                <span aria-hidden="true" className={`appearance-mode-swatch appearance-mode-swatch--${mode.value}`} />
                                <span>{mode.name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {onWorkspaceStyleChange && onColorModeChange && (
                <div className="appearance-selection-status" aria-live="polite">
                    <span>Selected: {selectedStyle.name} · {selectedMode.name}</span>
                    {isReadingRoomLight && (
                        <span className="appearance-preservation-cue">
                            Preserved reference: white paper, serif document, quiet editorial spacing.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

const ThemeExplorer = ({
    isOpen,
    onClose,
    currentTheme,
    onThemeChange,
    currentCodeTheme,
    onCodeThemeChange,
    currentWorkspaceStyle,
    onWorkspaceStyleChange,
}) => {
    const dialogRef = useRef(null);
    const closeDialog = useEffectEvent(() => onClose());

    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDialog();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusable = getTabbableElements(dialogRef.current);
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

        document.addEventListener('keydown', handleKeyDown);
        const initialFocusTarget = dialogRef.current?.querySelector('[data-autofocus="true"]')
            || dialogRef.current?.querySelector('button');
        initialFocusTarget?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const codePreview = `const hello = "world";\nfunction test() {\n  return true;\n}`;
    const selectedCodeTheme = themeNames.includes(currentCodeTheme) ? currentCodeTheme : themeNames[0];

    return (
        <div
            className="modal-overlay theme-explorer-overlay"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className="modal-content theme-explorer-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="theme-explorer-title"
                ref={dialogRef}
            >
                <div className="modal-header theme-explorer-header">
                    <div>
                        <h2 id="theme-explorer-title">Appearance</h2>
                        <p>Pair any workspace style with Light or Dark.</p>
                    </div>
                    <button type="button" className="close-btn icon-close-btn" onClick={onClose} aria-label="Close appearance">
                        <Icon name="close" />
                    </button>
                </div>

                <div className="theme-explorer-scroll-area">
                    <AppearanceSelector
                        workspaceStyle={currentWorkspaceStyle || 'workbench'}
                        colorMode={currentTheme || 'dark'}
                        onWorkspaceStyleChange={onWorkspaceStyleChange}
                        onColorModeChange={onThemeChange}
                        idPrefix="theme-explorer"
                    />

                    <fieldset className="code-theme-fieldset">
                        <legend>Code syntax theme</legend>
                        <p className="appearance-help">This affects fenced code blocks without changing the workspace style.</p>
                        <div className="code-theme-grid">
                            {themeNames.map((name) => (
                                <label
                                    key={name}
                                    className="code-theme-option"
                                    data-selected={currentCodeTheme === name}
                                >
                                    <input
                                        type="radio"
                                        name="theme-explorer-code-theme"
                                        value={name}
                                        checked={currentCodeTheme === name}
                                        tabIndex={name === selectedCodeTheme ? 0 : -1}
                                        onChange={() => onCodeThemeChange(name)}
                                    />
                                    <span className="code-preview-wrapper" aria-hidden="true">
                                        <SyntaxHighlighter
                                            language="javascript"
                                            style={themes[name]}
                                            // Third-party preview boundary: dimensions are local; colors come from the selected syntax theme.
                                            customStyle={{ margin: 0, padding: '10px', fontSize: '10px', height: '100%', overflow: 'hidden' }}
                                        >
                                            {codePreview}
                                        </SyntaxHighlighter>
                                    </span>
                                    <span className="theme-name">{name}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>
            </div>
        </div>
    );
};

export default ThemeExplorer;
