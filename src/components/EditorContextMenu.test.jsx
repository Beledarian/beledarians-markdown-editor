import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditorContextMenu from './EditorContextMenu';

describe('EditorContextMenu keyboard behavior', () => {
  it('exposes menuitems, supports arrow focus, and restores editor focus before actions', async () => {
    const editor = document.createElement('textarea');
    document.body.appendChild(editor);
    editor.focus();
    const onCopy = vi.fn(() => {
      expect(editor).toHaveFocus();
    });

    render(
      <EditorContextMenu
        x={20}
        y={20}
        onClose={vi.fn()}
        onCut={vi.fn()}
        onCopy={onCopy}
        onPaste={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    const menu = screen.getByRole('menu', { name: 'Editor actions' });
    const cut = screen.getByRole('menuitem', { name: /Cut/ });
    const copy = screen.getByRole('menuitem', { name: /Copy/ });
    await waitFor(() => expect(cut).toHaveFocus());

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(copy).toHaveFocus();
    fireEvent.click(copy);
    expect(onCopy).toHaveBeenCalledOnce();
    editor.remove();
  });

  it('closes on document Escape and restores the editor focus', async () => {
    const editor = document.createElement('textarea');
    document.body.appendChild(editor);
    editor.focus();
    const onClose = vi.fn();
    render(
      <EditorContextMenu
        x={20}
        y={20}
        onClose={onClose}
        onCut={vi.fn()}
        onCopy={vi.fn()}
        onPaste={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByRole('menuitem', { name: /Cut/ })).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    expect(editor).toHaveFocus();
    editor.remove();
  });
});
