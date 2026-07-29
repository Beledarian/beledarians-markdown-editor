import React, { useEffect, useEffectEvent, useRef } from 'react';
import { useOsEnv } from '../hooks/useOsEnv';
import Icon from './Icon';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const CheatSheetModal = ({ isOpen, onClose }) => {
  const { modKey, altKey } = useOsEnv();
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

  const cheatSheetData = [
    { syntax: '# Heading 1', description: 'Big Header' },
    { syntax: '## Heading 2', description: 'Medium Header' },
    { syntax: '**Bold**', description: 'Bold Text' },
    { syntax: '*Italic*', description: 'Italic Text' },
    { syntax: '[Link](http://...)', description: 'Hyperlink' },
    { syntax: '![Alt](img.png)', description: 'Image' },
    { syntax: '> Blockquote', description: 'Blockquote' },
    { syntax: '`Code`', description: 'Inline Code' },
    { syntax: '```\nCode Block\n```', description: 'Code Block' },
    { syntax: '- List Item', description: 'Unordered List' },
    { syntax: '1. List Item', description: 'Ordered List' },
    { syntax: '- [ ] Task', description: 'Task List' },
  ];

  const shortcutData = [
    { action: 'Save File', shortcut: `${modKey}+S` },
    { action: 'Open Folder', shortcut: `${modKey}+O` },
    { action: 'Toggle Sidebar', shortcut: `${modKey}+B` },
    { action: 'Export HTML', shortcut: `${modKey}+${altKey}+H` },
    { action: 'Export PDF', shortcut: `${modKey}+${altKey}+P` },
  ];

  return (
    <div
      className="modal-overlay cheat-sheet-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheat-sheet-title"
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
        ref={dialogRef}
      >
        <div className="modal-header">
          <h2 id="cheat-sheet-title">Markdown Cheat Sheet</h2>
          <button type="button" onClick={onClose} className="close-btn icon-close-btn" aria-label="Close Markdown cheat sheet" data-autofocus="true">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
           <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9em', marginBottom: '15px'}}>
               <thead>
                   <tr style={{textAlign: 'left', borderBottom: '1px solid var(--border-color)'}}>
                       <th style={{padding: '8px'}}>Syntax</th>
                       <th style={{padding: '8px'}}>Description</th>
                   </tr>
               </thead>
               <tbody>
                   {cheatSheetData.map((item, index) => (
                       <tr key={index} style={{borderBottom: 'var(--ui-hairline) solid var(--ui-border)'}}>
                           <td style={{padding: '8px', fontFamily: 'monospace', color: 'var(--button-bg-color)'}}>{item.syntax}</td>
                           <td style={{padding: '8px'}}>{item.description}</td>
                       </tr>
                   ))}
               </tbody>
           </table>

           <h3 style={{marginTop: '15px', marginBottom: '10px'}}>Shortcuts</h3>
           <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9em'}}>
               <thead>
                   <tr style={{textAlign: 'left', borderBottom: '1px solid var(--border-color)'}}>
                       <th style={{padding: '8px'}}>Action</th>
                       <th style={{padding: '8px'}}>Shortcut</th>
                   </tr>
               </thead>
               <tbody>
                   {shortcutData.map((item, index) => (
                       <tr key={index} style={{borderBottom: 'var(--ui-hairline) solid var(--ui-border)'}}>
                           <td style={{padding: '8px'}}>{item.action}</td>
                           <td style={{padding: '8px', fontFamily: 'monospace', color: 'var(--accent-color)'}}>{item.shortcut}</td>
                       </tr>
                   ))}
               </tbody>
           </table>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="primary-btn">Close</button>
        </div>
      </div>
    </div>
  );
};

export default CheatSheetModal;
