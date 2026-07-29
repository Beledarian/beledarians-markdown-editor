import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import App from './App.jsx';
import WorkspaceShell from './ui/WorkspaceShell.jsx';
import { useOsEnv } from './hooks/useOsEnv';

// Mock Tauri APIs to avoid errors in JSDOM
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd) => {
    if (cmd === 'get_initial_file') return Promise.resolve(null);
    return Promise.resolve();
  }),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  ask: vi.fn().mockResolvedValue(true),
}));

vi.mock('./hooks/useOsEnv', () => ({
  useOsEnv: vi.fn(),
}));

describe('App & Workspace Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    useOsEnv.mockReturnValue({
      isMac: false,
      modKey: 'Ctrl',
      altKey: 'Alt',
      isTauri: false,
    });
  });

  it('renders with default workspace-shell preset data attributes', () => {
    const { container } = render(<App />);
    const shell = container.querySelector('.workspace-shell');

    expect(shell).toBeInTheDocument();
    expect(shell).toHaveAttribute('data-style', 'workbench');
    expect(shell).toHaveAttribute('data-color-mode', 'dark');
    expect(shell).toHaveAttribute('data-theme', 'workbench-dark');
    expect(shell).toHaveAttribute('data-layout', 'split-workbench');
    expect(shell).toHaveAttribute('data-density', 'compact');
    expect(shell).toHaveAttribute('data-platform', 'windows');
  });

  it('wires the detected macOS platform into the workspace shell', () => {
    useOsEnv.mockReturnValue({
      isMac: true,
      modKey: '⌘',
      altKey: '⌥',
      isTauri: true,
    });

    const { container } = render(<App />);

    expect(container.querySelector('.workspace-shell')).toHaveAttribute('data-platform', 'macos');
  });

  it('proves all 6 workspace style x color mode combinations update shell attributes correctly', () => {
    const { container } = render(<App />);
    const shell = container.querySelector('.workspace-shell');

    const styles = ['workbench', 'reading', 'operator'];
    const modes = ['light', 'dark'];

    const styleSelect = screen.getByLabelText('Workspace Style');
    const themeBtn = screen.getByLabelText('Toggle Theme');

    for (const style of styles) {
      fireEvent.change(styleSelect, { target: { value: style } });
      for (const mode of modes) {
        // Toggle theme button toggles dark <-> light
        const currentMode = shell.getAttribute('data-color-mode');
        if (currentMode !== mode) {
          fireEvent.click(themeBtn);
        }

        expect(shell).toHaveAttribute('data-style', style);
        expect(shell).toHaveAttribute('data-color-mode', mode);
        expect(shell).toHaveAttribute('data-theme', `${style}-${mode}`);
      }
    }
  });

  it('keeps child/sentinel mounted and local state intact across workspace style and color mode switches', () => {
    // Harness component rendering WorkspaceShell with stateful sentinel child
    function StatefulSentinel({ id }) {
      const [count, setCount] = useState(0);
      return (
        <div>
          <span data-testid={`sentinel-id-${id}`}>{id}</span>
          <span data-testid="sentinel-count">{count}</span>
          <button data-testid="increment-btn" onClick={() => setCount((c) => c + 1)}>
            Increment
          </button>
        </div>
      );
    }

    function IntegrationHarness() {
      const [style, setStyle] = useState('workbench');
      const [mode, setMode] = useState('dark');

      return (
        <div>
          <button data-testid="set-reading" onClick={() => setStyle('reading')}>
            Reading
          </button>
          <button data-testid="set-operator" onClick={() => setStyle('operator')}>
            Operator
          </button>
          <button data-testid="toggle-mode" onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}>
            Toggle Mode
          </button>
          <WorkspaceShell workspaceStyle={style} colorMode={mode}>
            <StatefulSentinel id="test-sentinel" />
          </WorkspaceShell>
        </div>
      );
    }

    const { container } = render(<IntegrationHarness />);
    const shell = container.querySelector('.workspace-shell');

    // 1. Initial state
    expect(shell).toHaveAttribute('data-style', 'workbench');
    expect(shell).toHaveAttribute('data-color-mode', 'dark');

    // 2. Increment state in sentinel
    fireEvent.click(screen.getByTestId('increment-btn'));
    fireEvent.click(screen.getByTestId('increment-btn'));
    expect(screen.getByTestId('sentinel-count').textContent).toBe('2');

    // 3. Switch style to reading
    fireEvent.click(screen.getByTestId('set-reading'));
    expect(shell).toHaveAttribute('data-style', 'reading');
    expect(shell).toHaveAttribute('data-theme', 'reading-dark');
    // Sentinel state MUST be preserved (count == 2)
    expect(screen.getByTestId('sentinel-count').textContent).toBe('2');

    // 4. Switch color mode to light
    fireEvent.click(screen.getByTestId('toggle-mode'));
    expect(shell).toHaveAttribute('data-color-mode', 'light');
    expect(shell).toHaveAttribute('data-theme', 'reading-light');
    expect(screen.getByTestId('sentinel-count').textContent).toBe('2');

    // 5. Switch style to operator
    fireEvent.click(screen.getByTestId('set-operator'));
    expect(shell).toHaveAttribute('data-style', 'operator');
    expect(shell).toHaveAttribute('data-theme', 'operator-light');
    expect(screen.getByTestId('sentinel-count').textContent).toBe('2');
  });

  it('debounces localStorage draft persistence without data loss on unmount', () => {
    vi.useFakeTimers();

    const { unmount } = render(<App />);

    // MDEditor textarea element
    const textarea = document.querySelector('.w-md-editor-text-input');
    if (textarea) {
      fireEvent.change(textarea, { target: { value: '# Updated Content' } });

      // Before timer ticks, localStorage draft should not be updated immediately by timer
      // (it had initial value '# Hello, world!')
      expect(localStorage.getItem('md-draft')).not.toBe('# Updated Content');

      // Fast-forward timer 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(localStorage.getItem('md-draft')).toBe('# Updated Content');

      // Change again right before unmount
      fireEvent.change(textarea, { target: { value: '# Final Unmount Content' } });

      // Unmount immediately without waiting for timer
      act(() => {
        unmount();
      });

      // Unmount cleanup should flush markdownRef to localStorage
      expect(localStorage.getItem('md-draft')).toBe('# Final Unmount Content');
    }

    vi.useRealTimers();
  });

  it('imports Markdown through the mobile-compatible file input fallback', async () => {
    delete window.showOpenFilePicker;
    const { container } = render(<App />);
    const input = container.querySelector('#file-input');
    const file = new File(['# Phone note'], 'phone-note.md', { type: 'text/markdown' });
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: vi.fn().mockResolvedValue('# Phone note'),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /phone-note\.md/i })).toBeInTheDocument();
    });
    expect(document.querySelector('.w-md-editor-text-input')).toHaveValue('# Phone note');
    expect(input.value).toBe('');
  });

  it('downloads a Markdown copy instead of invoking native save for a browser draft', async () => {
    delete window.showSaveFilePicker;
    const createObjectURL = vi.fn().mockReturnValue('blob:markdown-download');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Save file' }));

    await waitFor(() => expect(anchorClick).toHaveBeenCalledOnce());
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    anchorClick.mockRestore();
  });

  it('projects Zen and Focus modes onto the workspace shell', () => {
    const { container } = render(<App />);
    const shell = container.querySelector('.workspace-shell');

    fireEvent.click(screen.getByText('Focus'));
    expect(shell).toHaveClass('focus-mode');

    fireEvent.click(screen.getByText('Zen'));
    expect(shell).toHaveClass('zen-mode');
    expect(shell).toHaveClass('focus-mode');
  });
});
