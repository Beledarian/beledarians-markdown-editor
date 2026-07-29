import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsModal from './SettingsModal';

vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }) => <pre>{children}</pre>,
}));

const createProps = () => ({
  isOpen: true,
  onClose: vi.fn(),
  shortcuts: { saveFile: 'Ctrl+S' },
  onUpdateShortcut: vi.fn(),
  wordGoal: 500,
  setWordGoal: vi.fn(),
  codeTheme: 'VS Code Dark',
  setCodeTheme: vi.fn(),
  imageSize: 80,
  setImageSize: vi.fn(),
  imageAlignment: 'none',
  setImageAlignment: vi.fn(),
  workspaceStyle: 'workbench',
  setWorkspaceStyle: vi.fn(),
  colorMode: 'dark',
  setColorMode: vi.fn(),
});

const SettingsHarness = () => {
  const [isOpen, setIsOpen] = useState(false);
  const props = createProps();

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open settings</button>
      <SettingsModal {...props} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

describe('SettingsModal', () => {
  it('renders safely when optional settings contracts are absent', () => {
    render(
      <SettingsModal
        isOpen
        onClose={vi.fn()}
        codeTheme="oneDark"
        setCodeTheme={vi.fn()}
        wordGoal={0}
        setWordGoal={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByLabelText('Code block theme')).toHaveValue('VS Code Dark');
  });

  it('exposes the same independent workspace style and color mode controls', () => {
    const props = createProps();
    const { rerender } = render(<SettingsModal {...props} />);

    const workbench = screen.getByRole('radio', { name: /^Workbench/ });
    const reading = screen.getByRole('radio', { name: /^Reading Room/ });
    const light = screen.getByRole('radio', { name: 'Light' });
    const dark = screen.getByRole('radio', { name: 'Dark' });
    expect(workbench).toHaveAttribute('tabindex', '0');
    expect(reading).toHaveAttribute('tabindex', '-1');
    expect(light).toHaveAttribute('tabindex', '-1');
    expect(dark).toHaveAttribute('tabindex', '0');

    fireEvent.click(reading);
    fireEvent.click(light);

    expect(props.setWorkspaceStyle).toHaveBeenCalledWith('reading');
    expect(props.setColorMode).toHaveBeenCalledWith('light');
    rerender(<SettingsModal {...props} workspaceStyle="reading" colorMode="light" />);
    expect(reading).toHaveAttribute('tabindex', '0');
    expect(workbench).toHaveAttribute('tabindex', '-1');
    expect(light).toHaveAttribute('tabindex', '0');
    expect(dark).toHaveAttribute('tabindex', '-1');
  });

  it('preserves code, image, goal, and shortcut settings behavior', () => {
    const props = createProps();
    render(<SettingsModal {...props} />);

    fireEvent.change(screen.getByLabelText('Code block theme'), { target: { value: 'Dracula' } });
    fireEvent.change(screen.getByLabelText('Image max width: 80%'), { target: { value: '65' } });
    fireEvent.change(screen.getByLabelText('Image alignment'), { target: { value: 'right' } });
    fireEvent.change(screen.getByLabelText(/Daily word goal/), { target: { value: '750' } });
    fireEvent.keyDown(screen.getByLabelText('Save File'), {
      key: 'k',
      ctrlKey: true,
      shiftKey: true,
    });

    expect(props.setCodeTheme).toHaveBeenCalledWith('Dracula');
    expect(props.setImageSize).toHaveBeenCalledWith(65);
    expect(props.setImageAlignment).toHaveBeenCalledWith('right');
    expect(props.setWordGoal).toHaveBeenCalledWith(750);
    expect(props.onUpdateShortcut).toHaveBeenCalledWith('saveFile', 'Ctrl+Shift+K');
  });

  it('closes on Escape and keeps modifier-only shortcut presses inert', () => {
    const props = createProps();
    render(<SettingsModal {...props} />);

    const shortcut = screen.getByLabelText('Save File');
    fireEvent.keyDown(shortcut, { key: 'Control', ctrlKey: true });
    expect(props.onUpdateShortcut).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('uses an accessible SVG close control and closes from the overlay', () => {
    const props = createProps();
    const { container } = render(<SettingsModal {...props} />);

    const closeButton = screen.getByRole('button', { name: 'Close settings' });
    expect(closeButton.querySelector('svg')).toBeInTheDocument();

    fireEvent.click(container.querySelector('.settings-modal-overlay'));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('focuses the selected style and restores the trigger after Escape', () => {
    render(<SettingsHarness />);
    const trigger = screen.getByRole('button', { name: 'Open settings' });

    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('radio', { name: /^Workbench/ })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('wraps focus forward and backward within the dialog', () => {
    render(<SettingsModal {...createProps()} />);
    const first = screen.getByRole('button', { name: 'Close settings' });
    const last = screen.getByRole('button', { name: 'Done' });

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('uses only the checked radio from each named group as a sequential tab stop', () => {
    render(<SettingsModal {...createProps()} />);
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    for (const control of dialog.querySelectorAll('button, select, input:not([type="radio"])')) {
      control.disabled = true;
    }

    const first = screen.getByRole('radio', { name: /^Workbench/ });
    const last = screen.getByRole('radio', { name: 'Dark' });
    expect(first).toBeChecked();
    expect(last).toBeChecked();

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});
