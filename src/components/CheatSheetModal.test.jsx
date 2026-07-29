import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CheatSheetModal from './CheatSheetModal';

vi.mock('../hooks/useOsEnv', () => ({
  useOsEnv: () => ({ modKey: 'Ctrl', altKey: 'Alt' }),
}));

const CheatSheetHarness = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open cheat sheet</button>
      <CheatSheetModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

describe('CheatSheetModal lifecycle', () => {
  it('focuses, contains Tab navigation, closes on Escape, and restores its trigger', () => {
    render(<CheatSheetHarness />);
    const trigger = screen.getByRole('button', { name: 'Open cheat sheet' });
    trigger.focus();
    fireEvent.click(trigger);

    const headerClose = screen.getByRole('button', { name: 'Close Markdown cheat sheet' });
    const footerClose = screen.getByRole('button', { name: 'Close' });
    expect(headerClose).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(footerClose).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(headerClose).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Markdown Cheat Sheet' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('dismisses only from the backdrop, not dialog content', () => {
    const onClose = vi.fn();
    const { container } = render(<CheatSheetModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('dialog', { name: 'Markdown Cheat Sheet' }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('.cheat-sheet-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
