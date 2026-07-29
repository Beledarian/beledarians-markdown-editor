import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FindReplaceModal from './FindReplaceModal';

const FindReplaceHarness = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open find and replace</button>
      <FindReplaceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onFind={vi.fn()}
        onReplace={vi.fn()}
        onReplaceAll={vi.fn()}
      />
    </>
  );
};

describe('FindReplaceModal lifecycle', () => {
  it('focuses, contains Tab navigation, closes on Escape, and restores its trigger', () => {
    render(<FindReplaceHarness />);
    const trigger = screen.getByRole('button', { name: 'Open find and replace' });
    trigger.focus();
    fireEvent.click(trigger);

    const findInput = screen.getByLabelText('Find:');
    const close = screen.getByRole('button', { name: 'Close find and replace' });
    const replaceAll = screen.getByRole('button', { name: 'Replace All' });
    expect(findInput).toHaveFocus();

    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(replaceAll).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Find & Replace' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not dismiss from outside clicks and preserves find and replace actions', () => {
    const onClose = vi.fn();
    const onFind = vi.fn();
    const onReplace = vi.fn();
    const onReplaceAll = vi.fn();
    render(
      <FindReplaceModal
        isOpen
        onClose={onClose}
        onFind={onFind}
        onReplace={onReplace}
        onReplaceAll={onReplaceAll}
      />,
    );

    const findInput = screen.getByLabelText('Find:');
    const replaceInput = screen.getByLabelText('Replace:');
    fireEvent.change(findInput, { target: { value: 'alpha' } });
    fireEvent.change(replaceInput, { target: { value: 'beta' } });
    fireEvent.keyDown(findInput, { key: 'Enter' });
    fireEvent.keyDown(replaceInput, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Replace All' }));
    fireEvent.mouseDown(document.body);

    expect(onFind).toHaveBeenCalledWith('alpha');
    expect(onReplace).toHaveBeenCalledWith('alpha', 'beta', expect.anything(), expect.anything());
    expect(onReplaceAll).toHaveBeenCalledWith('alpha', 'beta', expect.anything(), expect.anything());
    expect(onClose).not.toHaveBeenCalled();
  });
});
