import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PrintModal from './PrintModal';

const PrintHarness = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open print options</button>
      <PrintModal isOpen={isOpen} onClose={() => setIsOpen(false)} onPrint={vi.fn()} />
    </>
  );
};

describe('PrintModal lifecycle', () => {
  it('focuses, contains Tab navigation, closes on Escape, and restores its trigger', () => {
    render(<PrintHarness />);
    const trigger = screen.getByRole('button', { name: 'Open print options' });
    trigger.focus();
    fireEvent.click(trigger);

    const close = screen.getByRole('button', { name: 'Close print options' });
    const print = screen.getByRole('button', { name: 'Print' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(print).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Print Options' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('dismisses only from the backdrop and preserves the print payload', () => {
    const onClose = vi.fn();
    const onPrint = vi.fn();
    const { container } = render(<PrintModal isOpen onClose={onClose} onPrint={onPrint} />);

    fireEvent.click(screen.getByRole('dialog', { name: 'Print Options' }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: 'Dark Mode' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Remove Borders/Margins' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(onPrint).toHaveBeenCalledWith({
      theme: 'dark',
      removeMargins: false,
      showFooter: true,
    });

    fireEvent.click(container.querySelector('.print-modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
