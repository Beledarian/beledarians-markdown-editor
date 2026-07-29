import { useEffect, useEffectEvent, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { themes, themeNames } from '../utils/codeThemes';
import Icon from './Icon';
import { AppearanceSelector } from './ThemeExplorer';
import './SettingsModal.css';

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

const SettingsModal = ({
  isOpen,
  onClose,
  shortcuts = {},
  onUpdateShortcut = () => {},
  wordGoal,
  setWordGoal,
  codeTheme,
  setCodeTheme,
  imageSize = 100,
  setImageSize = () => {},
  imageAlignment = 'none',
  setImageAlignment = () => {},
  workspaceStyle,
  setWorkspaceStyle,
  colorMode,
  setColorMode,
}) => {
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

    document.addEventListener('keydown', handleDialogKeyDown);
    const initialFocusTarget = dialogRef.current?.querySelector('[data-autofocus="true"]')
      || dialogRef.current?.querySelector('button');
    initialFocusTarget?.focus();

    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCodeTheme = themes[codeTheme] ? codeTheme : 'VS Code Dark';

  const handleKeyDown = (event, action) => {
    event.preventDefault();
    event.stopPropagation();

    const keys = [];
    if (event.ctrlKey) keys.push('Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    if (event.metaKey) keys.push('Meta');

    if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;

    let key = event.key.toUpperCase();
    if (key === ' ') key = 'SPACE';

    keys.push(key);
    onUpdateShortcut(action, keys.join('+'));
  };

  return (
    <div
      className="modal-overlay settings-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        ref={dialogRef}
      >
        <div className="modal-header settings-modal-header">
          <div>
            <h2 id="settings-title">Settings</h2>
            <p>Appearance, writing goals, media, and keyboard controls.</p>
          </div>
          <button type="button" onClick={onClose} className="close-btn icon-close-btn" aria-label="Close settings">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body settings-modal-body">
          <section className="settings-section" aria-labelledby="settings-appearance-title">
            <h3 id="settings-appearance-title">Appearance</h3>
            <AppearanceSelector
              workspaceStyle={workspaceStyle || 'workbench'}
              colorMode={colorMode || 'dark'}
              onWorkspaceStyleChange={setWorkspaceStyle}
              onColorModeChange={setColorMode}
              idPrefix="settings"
            />

            <div className="settings-control">
              <label htmlFor="settings-code-theme">Code block theme</label>
              <select
                id="settings-code-theme"
                value={activeCodeTheme}
                onChange={(event) => setCodeTheme(event.target.value)}
              >
                {themeNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <div className="settings-code-preview" aria-label={`${activeCodeTheme} code theme preview`}>
                <SyntaxHighlighter
                  language="javascript"
                  style={themes[activeCodeTheme]}
                  // Third-party preview boundary: colors come from the selected syntax theme.
                  customStyle={{ margin: 0, fontSize: '12px', overflow: 'hidden' }}
                >
                  {`// Preview
function hello() {
  console.log("Hello World!");
  return true;
}`}
                </SyntaxHighlighter>
              </div>
            </div>

            <div className="settings-control">
              <label htmlFor="settings-image-size">Image max width: {imageSize}%</label>
              <input
                id="settings-image-size"
                type="range"
                min="10"
                max="100"
                value={imageSize}
                onChange={(event) => setImageSize(parseInt(event.target.value, 10))}
              />
            </div>

            <div className="settings-control">
              <label htmlFor="settings-image-alignment">Image alignment</label>
              <select
                id="settings-image-alignment"
                value={imageAlignment}
                onChange={(event) => setImageAlignment(event.target.value)}
              >
                <option value="none">Default (none)</option>
                <option value="left">Left (wrap text)</option>
                <option value="right">Right (wrap text)</option>
              </select>
            </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-goals-title">
            <h3 id="settings-goals-title">Goals</h3>
            <div className="settings-control settings-control--inline">
              <label htmlFor="settings-word-goal">Daily word goal <span>(0 to disable)</span></label>
              <input
                id="settings-word-goal"
                type="number"
                min="0"
                value={wordGoal || 0}
                onChange={(event) => setWordGoal(parseInt(event.target.value, 10) || 0)}
              />
            </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-shortcuts-title">
            <h3 id="settings-shortcuts-title">Keyboard shortcuts</h3>
            <div className="shortcut-list">
              {Object.entries(shortcuts || {}).map(([action, combo]) => (
                <div key={action} className="shortcut-item">
                  <label htmlFor={`shortcut-${action}`}>
                    {action.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase())}
                  </label>
                  <input
                    id={`shortcut-${action}`}
                    type="text"
                    value={combo}
                    readOnly
                    onKeyDown={(event) => handleKeyDown(event, action)}
                    placeholder="Record shortcut"
                    className="shortcut-input"
                    title="Focus and press keys to record a new shortcut"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="modal-footer settings-modal-footer">
          <p className="hint">Focus a shortcut field, then press the desired key combination.</p>
          <button type="button" onClick={onClose} className="primary-btn">Done</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
