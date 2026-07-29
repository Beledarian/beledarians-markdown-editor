import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import Icon from './Icon';
import './McpAgentSetupModal.css';

const AGENTS = [
  {
    key: 'claude',
    name: 'Claude Code',
    summary: 'Registers mdedit with the Claude Code CLI.',
    command: 'claude mcp add mdedit -- node <path-to-md.mjs> mcp',
  },
  {
    key: 'codex',
    name: 'OpenAI Codex',
    summary: 'Registers mdedit with the Codex CLI.',
    command: 'codex mcp add mdedit -- node <path-to-md.mjs> mcp',
  },
  {
    key: 'antigravity',
    name: 'Antigravity / Gemini',
    summary: 'Adds mdedit to the local Antigravity MCP configuration.',
    command: '~/.gemini/antigravity/mcp_config.json',
  },
];

export default function McpAgentSetupModal({ isOpen, onClose }) {
  const [selectedAgents, setSelectedAgents] = useState({
    claude: true,
    codex: true,
    antigravity: true,
  });
  const [installSkill, setInstallSkill] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState('setup');
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setPage('setup');
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleAgent = (key) => {
    setSelectedAgents((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const handleApply = async () => {
    const targets = Object.keys(selectedAgents).filter((key) => selectedAgents[key]);
    if (targets.length === 0) {
      toast('Select at least one integration');
      return;
    }

    setIsSubmitting(true);
    try {
      if (window.__TAURI_INTERNALS__) {
        const results = await invoke('configure_mcp_integrations', {
          targets,
          installSkill,
        });
        if (Array.isArray(results)) {
          results.forEach((result) => {
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
          });
        }
      } else {
        const skillStatus = installSkill ? ' and installed the authoring skill' : '';
        toast.success(`Mock: Configured ${targets.join(', ')} MCP integrations${skillStatus}`);
      }
      localStorage.setItem('md-mcp-setup-prompted', 'true');
      onClose();
    } catch (error) {
      toast.error(`Configuration error: ${error?.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHide = () => {
    localStorage.setItem('md-mcp-setup-prompted', 'true');
    onClose();
  };

  return (
    <div
      className="modal-overlay mcp-setup-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-content mcp-setup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-setup-title"
      >
        <header className="modal-header mcp-setup-header">
          <div>
            <p className="mcp-setup-kicker">mdedit connection</p>
            <h2 id="mcp-setup-title">
              {page === 'setup' ? 'Connect AI agents' : 'MCP setup guide'}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="close-btn mcp-icon-button"
            aria-label="Close MCP setup"
          >
            <Icon name="close" />
          </button>
        </header>

        {page === 'setup' ? (
          <>
            <div className="modal-body mcp-setup-body">
              <p className="mcp-setup-intro">
                Let local coding agents open, search, edit, and export Markdown through the
                live <code>mdedit</code> server.
              </p>

              <fieldset className="mcp-agent-list">
                <legend className="visually-hidden">AI agent integrations</legend>
                {AGENTS.map((agent) => (
                  <label className="mcp-agent-option" key={agent.key}>
                    <input
                      type="checkbox"
                      checked={selectedAgents[agent.key]}
                      onChange={() => toggleAgent(agent.key)}
                    />
                    <span className="mcp-agent-copy">
                      <strong>{agent.name}</strong>
                      <span>{agent.summary}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <label className="mcp-skill-option">
                <input
                  type="checkbox"
                  checked={installSkill}
                  onChange={(event) => setInstallSkill(event.target.checked)}
                />
                <span className="mcp-agent-copy">
                  <strong>Install Markdown authoring skill</strong>
                  <span>
                    Optional. Adds the custom color, highlight, font, size, and wiki-link
                    rules to each selected agent.
                  </span>
                  <small>
                    Codex: ~/.agents/skills · Claude: ~/.claude/skills · Gemini:
                    ~/.gemini/skills
                  </small>
                </span>
              </label>

              <button
                type="button"
                className="mcp-guide-link"
                onClick={() => setPage('guide')}
              >
                <Icon name="document" />
                View setup instructions
              </button>
            </div>

            <footer className="modal-footer mcp-setup-footer">
              <button type="button" className="mcp-button mcp-button-quiet" onClick={handleHide}>
                Hide this popup
              </button>
              <div className="mcp-footer-actions">
                <button type="button" className="mcp-button" onClick={onClose}>
                  Later
                </button>
                <button
                  type="button"
                  className="mcp-button mcp-button-primary"
                  onClick={handleApply}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Configuring…' : 'Configure selected'}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <>
            <article className="modal-body mcp-guide-page">
              <p className="mcp-guide-lead">
                Choose an automatic setup from the previous page, or use these commands when
                you prefer to inspect the configuration yourself.
              </p>

              <ol className="mcp-guide-steps">
                <li>
                  <strong>Keep the editor open</strong>
                  <p>The desktop app hosts the local mdedit bridge while you work.</p>
                </li>
                <li>
                  <strong>Register your agent</strong>
                  <div className="mcp-command-list">
                    {AGENTS.map((agent) => (
                      <div className="mcp-command" key={agent.key}>
                        <span>{agent.name}</span>
                        <code>{agent.command}</code>
                      </div>
                    ))}
                  </div>
                </li>
                <li>
                  <strong>Restart the agent</strong>
                  <p>Open a fresh agent session, then ask it to list the mdedit tools.</p>
                </li>
              </ol>

              <aside className="mcp-guide-note">
                Automatic setup uses the bundled mdedit path. Replace{' '}
                <code>&lt;path-to-md.mjs&gt;</code> only when configuring manually. The
                optional authoring skill installs separately from MCP and never replaces a
                different existing copy.
              </aside>
            </article>

            <footer className="modal-footer mcp-setup-footer">
              <button
                type="button"
                className="mcp-button"
                onClick={() => setPage('setup')}
              >
                Back to setup
              </button>
              <button type="button" className="mcp-button mcp-button-primary" onClick={onClose}>
                Done
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
