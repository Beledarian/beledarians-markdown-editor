import React, { useEffect, useEffectEvent, useRef, useState, useMemo } from 'react';
import Icon from './Icon';
import './FindReplaceModal.css';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const FindReplaceModal = ({ isOpen, onClose, onFind, onReplace, onReplaceAll, markdown = '' }) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const findInputRef = useRef(null);
  const dialogRef = useRef(null);
  const closeDialog = useEffectEvent(() => onClose());

  const matchCount = useMemo(() => {
    if (!findText) return 0;
    try {
      let regexStr = findText;
      if (!useRegex) {
        regexStr = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      const flags = matchCase ? 'g' : 'gi';
      const matches = markdown.match(new RegExp(regexStr, flags));
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [findText, markdown, matchCase, useRegex]);

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
    findInputRef.current?.focus();
    findInputRef.current?.select();

    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="find-replace-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="find-replace-title"
      ref={dialogRef}
    >
      <div className="find-replace-content">
        <div className="find-replace-header">
          <h3 id="find-replace-title">Find & Replace</h3>
          <button type="button" className="close-btn icon-close-btn" onClick={onClose} aria-label="Close find and replace">
            <Icon name="close" />
          </button>
        </div>
        <div className="find-replace-body">
          <div className="input-group">
            <label htmlFor="find-replace-find">Find:</label>
            <input
              id="find-replace-find"
              ref={findInputRef}
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFind(findText);
              }}
            />
          </div>
          <div className="input-group">
            <label htmlFor="find-replace-replacement">Replace:</label>
            <input
              id="find-replace-replacement"
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onReplace(findText, replaceText, matchCase, useRegex);
              }}
            />
          </div>
          <div className="options-group">
            <label>
              <input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} />
              Match Case
            </label>
            <label>
              <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} />
              Use Regex
            </label>
          </div>
          {findText && (
            <div className="find-match-info" aria-live="polite">
              {matchCount === 1 ? '1 match found' : `${matchCount} matches found`}
            </div>
          )}
        </div>
        <div className="find-replace-footer">
          <button onClick={() => onFind(findText, matchCase, useRegex, true)}>Find Prev</button>
          <button onClick={() => onFind(findText, matchCase, useRegex, false)}>Find Next</button>
          <button onClick={() => onReplace(findText, replaceText, matchCase, useRegex)}>Replace</button>
          <button onClick={() => onReplaceAll(findText, replaceText, matchCase, useRegex)}>Replace All</button>
        </div>
      </div>
    </div>
  );
};

export default FindReplaceModal;
