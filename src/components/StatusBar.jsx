import React from 'react';
import Tooltip from './Tooltip';
import Icon from './Icon';
import './WorkspaceChrome.css';

const StatusBar = ({
  currentFile,
  unsavedChanges,
  isSaving,
  lineCount,
  wordCount,
  wordGoal,
  onSetWordGoal,
  charCount,
  readingTime,
  handleInsertTimestamp,
  shortcuts = {},
  cursorPos,
}) => {
  const saveState = isSaving
    ? 'Saving to disk'
    : unsavedChanges
      ? 'Unsaved changes'
      : currentFile?.lastSaveKind === 'download'
        ? 'Downloaded copy'
        : currentFile?.storageKind === 'draft'
          ? 'Saved locally'
          : currentFile?.storageKind === 'web-import'
            ? 'Opened copy'
            : currentFile
              ? 'Saved to disk'
              : 'Local draft';

  const handleWordGoalClick = () => {
    const input = prompt('Set word count target goal (0 to disable):', wordGoal || 0);
    if (input !== null) {
      const val = parseInt(input.trim(), 10);
      if (!isNaN(val) && val >= 0) {
        onSetWordGoal?.(val);
      }
    }
  };

  return (
    <div className="status-bar application-status">
      <div className="status-cluster document-state">
        <span
          className={`save-state ${isSaving ? 'saving' : unsavedChanges ? 'dirty' : 'saved'}`}
          aria-live="polite"
        >
          <span className="state-indicator" aria-hidden="true" />
          {saveState}
        </span>
        <span className="status-item current-document">
          File {currentFile?.name || 'Untitled'}
        </span>
      </div>

      <div className="status-cluster document-metrics">
        <span className="status-item cursor-position">
          <span className="metric-label">Line</span>
          <span>{cursorPos?.line || lineCount}</span>
          <span className="metric-label">Column</span>
          <span>{cursorPos?.col || 1}</span>
        </span>
        <button
          type="button"
          onClick={handleWordGoalClick}
          className={`status-item word-count clickable-status-btn ${wordGoal > 0 && wordCount >= wordGoal ? 'goal-met' : ''}`}
          title="Click to set word goal target"
        >
          <span className="metric-label">Words</span>
          <span>{wordCount}</span>
          {wordGoal > 0 && <span className="word-goal">of {wordGoal}</span>}
        </button>
        <span className="status-item character-count">
          <span className="metric-label">Characters</span>
          <span>{charCount}</span>
        </span>
        <span className="status-item reading-time">
          <span>{readingTime} min read</span>
        </span>
        <span className="status-item local-state">Local</span>
        <Tooltip text="Insert Timestamp" shortcut={shortcuts.timestamp}>
          <button className="timestamp-button" type="button" onClick={handleInsertTimestamp} aria-label="Insert Timestamp">
            <Icon name="timestamp" />
          </button>
        </Tooltip>
      </div>
      <style>{`
        .clickable-status-btn {
          background: transparent;
          border: none;
          color: inherit;
          font: inherit;
          cursor: pointer;
          padding: 0 4px;
          border-radius: 3px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .clickable-status-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

export default StatusBar;
