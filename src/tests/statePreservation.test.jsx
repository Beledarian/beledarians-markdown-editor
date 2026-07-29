import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React, { useState } from 'react';
import WorkspaceShell from '../ui/WorkspaceShell.jsx';

// Stateful Test Harness Component representing a persistent editor instance with local state
function StatefulEditorHarness({ initialText = 'Persistent Markdown Document' }) {
  const [text, setText] = useState(initialText);
  const [switchCount, setSwitchCount] = useState(0);

  return (
    <div data-testid="editor-root">
      <input
        data-testid="editor-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button data-testid="editor-button" onClick={() => setSwitchCount((c) => c + 1)}>
        Count: {switchCount}
      </button>
    </div>
  );
}

// Parent Wrapper controlling WorkspaceShell style & color mode state
function WorkspaceShellTestContainer({ initialStyle = 'workbench', initialMode = 'dark' }) {
  const [pref, setPref] = useState({ workspaceStyle: initialStyle, colorMode: initialMode });

  return (
    <div>
      <div data-testid="controls">
        <button
          data-testid="btn-set-workbench-dark"
          onClick={() => setPref({ workspaceStyle: 'workbench', colorMode: 'dark' })}
        >
          WB Dark
        </button>
        <button
          data-testid="btn-set-reading-light"
          onClick={() => setPref({ workspaceStyle: 'reading', colorMode: 'light' })}
        >
          Reading Light
        </button>
        <button
          data-testid="btn-set-operator-dark"
          onClick={() => setPref({ workspaceStyle: 'operator', colorMode: 'dark' })}
        >
          Operator Dark
        </button>
        <button
          data-testid="btn-set-workbench-light"
          onClick={() => setPref({ workspaceStyle: 'workbench', colorMode: 'light' })}
        >
          WB Light
        </button>
        <button
          data-testid="btn-set-reading-dark"
          onClick={() => setPref({ workspaceStyle: 'reading', colorMode: 'dark' })}
        >
          Reading Dark
        </button>
        <button
          data-testid="btn-set-operator-light"
          onClick={() => setPref({ workspaceStyle: 'operator', colorMode: 'light' })}
        >
          Operator Light
        </button>
      </div>

      <WorkspaceShell workspaceStyle={pref.workspaceStyle} colorMode={pref.colorMode}>
        <StatefulEditorHarness />
      </WorkspaceShell>
    </div>
  );
}

describe('State Preservation Verification Harness', () => {
  it('executes a focused six-combination transition preserving child identity, state, and focus', () => {
    const { container } = render(<WorkspaceShellTestContainer initialStyle="workbench" initialMode="dark" />);

    const shell = container.querySelector('.workspace-shell');
    const input = screen.getByTestId('editor-input');
    const initialInputDOMNode = input;
    const initialRootDOMNode = screen.getByTestId('editor-root');

    // Type text into input to establish local child state
    act(() => {
      input.focus();
    });
    expect(document.activeElement).toBe(input);

    const sixCombinations = [
      { style: 'workbench', mode: 'dark', layout: 'split-workbench', density: 'compact', theme: 'workbench-dark', btnId: 'btn-set-workbench-dark' },
      { style: 'reading', mode: 'light', layout: 'focus-canvas', density: 'comfortable', theme: 'reading-light', btnId: 'btn-set-reading-light' },
      { style: 'operator', mode: 'dark', layout: 'command-proof', density: 'dense', theme: 'operator-dark', btnId: 'btn-set-operator-dark' },
      { style: 'workbench', mode: 'light', layout: 'split-workbench', density: 'compact', theme: 'workbench-light', btnId: 'btn-set-workbench-light' },
      { style: 'reading', mode: 'dark', layout: 'focus-canvas', density: 'comfortable', theme: 'reading-dark', btnId: 'btn-set-reading-dark' },
      { style: 'operator', mode: 'light', layout: 'command-proof', density: 'dense', theme: 'operator-light', btnId: 'btn-set-operator-light' },
    ];

    for (const combo of sixCombinations) {
      act(() => {
        screen.getByTestId(combo.btnId).click();
      });

      // 1. Assert shell data attributes update correctly
      expect(shell).toHaveAttribute('data-style', combo.style);
      expect(shell).toHaveAttribute('data-color-mode', combo.mode);
      expect(shell).toHaveAttribute('data-theme', combo.theme);
      expect(shell).toHaveAttribute('data-layout', combo.layout);
      expect(shell).toHaveAttribute('data-density', combo.density);

      // 2. Assert child DOM node identity is preserved (0 remounts)
      const currentInputDOMNode = screen.getByTestId('editor-input');
      const currentRootDOMNode = screen.getByTestId('editor-root');
      expect(currentInputDOMNode).toBe(initialInputDOMNode);
      expect(currentRootDOMNode).toBe(initialRootDOMNode);

      // 3. Assert local state inside child is preserved
      expect(currentInputDOMNode.value).toBe('Persistent Markdown Document');

      // 4. Assert focus retention where JSDOM supports it
      if (document.activeElement) {
        expect(document.activeElement).toBe(currentInputDOMNode);
      }
    }
  });

  it('performs repeated 30-switch child/editor identity and state stability test', () => {
    function SwitcherApp() {
      const [step, setStep] = useState(0);
      const styles = ['workbench', 'reading', 'operator'];
      const modes = ['dark', 'light'];

      const currStyle = styles[step % styles.length];
      const currMode = modes[step % modes.length];

      return (
        <div>
          <button data-testid="btn-step" onClick={() => setStep((s) => s + 1)}>
            Step {step}
          </button>
          <WorkspaceShell workspaceStyle={currStyle} colorMode={currMode}>
            <StatefulEditorHarness initialText="30-Switch Stability Test Document" />
          </WorkspaceShell>
        </div>
      );
    }

    const { container } = render(<SwitcherApp />);

    const initialInputNode = screen.getByTestId('editor-input');
    const initialRootNode = screen.getByTestId('editor-root');
    const stepBtn = screen.getByTestId('btn-step');

    // Click increment button in child to mutate child local state
    const editorBtn = screen.getByTestId('editor-button');
    act(() => {
      editorBtn.click();
      editorBtn.click();
    });
    expect(screen.getByTestId('editor-button')).toHaveTextContent('Count: 2');

    // Execute 30 switches
    for (let i = 1; i <= 30; i++) {
      act(() => {
        stepBtn.click();
      });

      const currentInputNode = screen.getByTestId('editor-input');
      const currentRootNode = screen.getByTestId('editor-root');

      // Assert zero remounts occurred: exact same DOM nodes
      expect(currentInputNode).toBe(initialInputNode);
      expect(currentRootNode).toBe(initialRootNode);

      // Assert local child state is preserved across all 30 switches
      expect(currentInputNode.value).toBe('30-Switch Stability Test Document');
      expect(screen.getByTestId('editor-button')).toHaveTextContent('Count: 2');
    }

    // Ensure WorkspaceShell data attributes remain valid after 30 switches
    const shell = container.querySelector('.workspace-shell');
    expect(shell).toHaveAttribute('data-style');
    expect(shell).toHaveAttribute('data-color-mode');
    expect(shell).toHaveAttribute('data-theme');
  });
});
