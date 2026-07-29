import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import McpAgentSetupModal from './McpAgentSetupModal';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([
    { target: 'claude', success: true, message: 'Registered in Claude Code' },
    { target: 'codex', success: true, message: 'Registered in Codex' },
    { target: 'antigravity', success: true, message: 'Updated Antigravity' }
  ])
}));

describe('McpAgentSetupModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(invoke).mockClear();
    delete window.__TAURI_INTERNALS__;
  });

  test('renders with all agent checkboxes checked by default', () => {
    render(<McpAgentSetupModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Connect AI agents')).toBeDefined();
    expect(screen.getByText('Claude Code')).toBeDefined();
    expect(screen.getByText('OpenAI Codex')).toBeDefined();
    expect(screen.getByText('Antigravity / Gemini')).toBeDefined();
  });

  test('toggles agent options and submits configuration', () => {
    const handleClose = vi.fn();
    render(<McpAgentSetupModal isOpen={true} onClose={handleClose} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(4);
    
    // Toggle off Codex
    fireEvent.click(checkboxes[1]);
    expect(checkboxes[1].checked).toBe(false);

    const submitBtn = screen.getByText('Configure selected');
    fireEvent.click(submitBtn);
  });

  test('optionally installs the authoring skill for selected agents', async () => {
    window.__TAURI_INTERNALS__ = {};
    render(<McpAgentSetupModal isOpen={true} onClose={() => {}} />);

    const skillOption = screen.getByRole('checkbox', {
      name: /Install Markdown authoring skill/i,
    });
    expect(skillOption.checked).toBe(false);

    fireEvent.click(skillOption);
    fireEvent.click(screen.getByText('Configure selected'));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('configure_mcp_integrations', {
        targets: ['claude', 'codex', 'antigravity'],
        installSkill: true,
      });
    });
  });

  test('dismisses and saves preference on Dont show again', () => {
    const handleClose = vi.fn();
    render(<McpAgentSetupModal isOpen={true} onClose={handleClose} />);

    const dontShowBtn = screen.getByText('Hide this popup');
    fireEvent.click(dontShowBtn);

    expect(localStorage.getItem('md-mcp-setup-prompted')).toBe('true');
    expect(handleClose).toHaveBeenCalled();
  });

  test('opens the clean setup guide and returns to setup', () => {
    render(<McpAgentSetupModal isOpen={true} onClose={() => {}} />);

    fireEvent.click(screen.getByText('View setup instructions'));
    expect(screen.getByText('MCP setup guide')).toBeDefined();
    expect(screen.getByText('Register your agent')).toBeDefined();
    expect(screen.getByText(/codex mcp add mdedit/)).toBeDefined();

    fireEvent.click(screen.getByText('Back to setup'));
    expect(screen.getByText('Connect AI agents')).toBeDefined();
  });

  test('keeps the guide open when the parent supplies a new close callback', () => {
    const { rerender } = render(
      <McpAgentSetupModal isOpen={true} onClose={() => {}} />
    );

    fireEvent.click(screen.getByText('View setup instructions'));
    rerender(<McpAgentSetupModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('MCP setup guide')).toBeDefined();
  });

  test('closes with Escape without hiding future prompts', () => {
    const handleClose = vi.fn();
    render(<McpAgentSetupModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalled();
    expect(localStorage.getItem('md-mcp-setup-prompted')).toBeNull();
  });
});
