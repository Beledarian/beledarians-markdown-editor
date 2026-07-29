import React from 'react';
import './StartScreen.css';

const StartScreen = ({ onOpenFolder, onCreateNewFile, recentFiles, onFileSelect }) => (
  <section className="start-screen" aria-labelledby="start-screen-title">
    <div className="start-screen__content">
      <p className="start-screen__eyebrow">Local-first Markdown workspace</p>
      <h1 id="start-screen-title">Start with a document.</h1>
      <p className="start-screen__lede">
        Open a workspace or create a Markdown file. Automation stays available
        through the CLI and MCP boundary, outside the writing surface.
      </p>

      <div className="start-screen__actions">
        <button className="primary" type="button" onClick={() => onCreateNewFile('Untitled.md')}>
          New document
        </button>
        <button type="button" onClick={onOpenFolder}>
          Open workspace
        </button>
      </div>

      {recentFiles?.length > 0 && (
        <div className="start-screen__recent">
          <h2>Recent documents</h2>
          <div className="start-screen__recent-list">
            {recentFiles.slice(0, 6).map((file) => (
              <button
                key={file.path}
                type="button"
                className="start-screen__recent-item"
                onClick={() => onFileSelect(file)}
                title={file.path}
              >
                <span>{file.name}</span>
                <small>{file.path}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <dl className="start-screen__shortcuts" aria-label="Useful shortcuts">
        <div><dt>Save</dt><dd><kbd>Ctrl/Cmd</kbd><span>+</span><kbd>S</kbd></dd></div>
        <div><dt>Navigator</dt><dd><kbd>Ctrl/Cmd</kbd><span>+</span><kbd>B</kbd></dd></div>
        <div><dt>Search</dt><dd><kbd>Ctrl/Cmd</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>F</kbd></dd></div>
      </dl>
    </div>
  </section>
);

export default StartScreen;
