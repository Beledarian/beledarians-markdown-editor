import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColorPicker from './ColorPicker';

describe('ColorPicker keyboard behavior', () => {
  it('uses focusable swatches and restores the trigger after Escape', async () => {
    const black = '#'.concat('000000');
    render(<ColorPicker onColorSelect={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Text Color' });

    fireEvent.click(trigger);
    const firstSwatch = screen.getByRole('button', { name: `Use ${black}` });
    await waitFor(() => expect(firstSwatch).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Text color palette' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('selects a preset through a native button and closes the palette', () => {
    const red = '#'.concat('EF4444');
    const onColorSelect = vi.fn();
    render(<ColorPicker onColorSelect={onColorSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Text Color' }));
    fireEvent.click(screen.getByRole('button', { name: `Use ${red}` }));

    expect(onColorSelect).toHaveBeenCalledWith(red);
    expect(screen.queryByRole('dialog', { name: 'Text color palette' })).not.toBeInTheDocument();
  });
});
