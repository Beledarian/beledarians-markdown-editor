import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GlobalSearchModal from './GlobalSearchModal';

const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args) => invokeMock(...args),
}));

const SearchHarness = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open search</button>
      <GlobalSearchModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        files={[]}
        onFileSelect={vi.fn()}
        onNavigate={vi.fn()}
      />
    </>
  );
};

afterEach(() => {
  vi.useRealTimers();
});

describe('GlobalSearchModal keyboard lifecycle', () => {
  it('focuses the query, contains Tab, closes on document Escape, and restores focus', async () => {
    render(<SearchHarness />);
    const trigger = screen.getByRole('button', { name: 'Open search' });
    trigger.focus();
    fireEvent.click(trigger);

    const input = screen.getByRole('textbox', { name: 'Search all files' });
    const close = screen.getByRole('button', { name: 'Close global search' });
    await waitFor(() => expect(input).toHaveFocus());

    input.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(input).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Global Search' })).not.toBeInTheDocument();
  });

  it('renders search matches as native buttons', async () => {
    vi.useFakeTimers();
    const files = [{
      name: 'guide.md',
      path: '/guide.md',
      handle: {
        getFile: vi.fn(async () => ({
          text: async () => 'A searchable needle appears here.',
        })),
      },
    }];
    render(
      <GlobalSearchModal
        isOpen
        onClose={vi.fn()}
        files={files}
        onFileSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search all files' }), {
      target: { value: 'needle' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.getByRole('button', { name: /guide\.md line 1/i })).toBeInTheDocument();
  });

  it('searches every occurrence in native Tauri files without browser handles', async () => {
    vi.useFakeTimers();
    invokeMock.mockResolvedValue('needle once\nand needle twice');
    render(
      <GlobalSearchModal
        isOpen
        onClose={vi.fn()}
        files={[{ name: 'native.md', path: 'C:\\notes\\native.md', handle: null }]}
        onFileSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search all files' }), {
      target: { value: 'needle' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(invokeMock).toHaveBeenCalledWith('read_file', {
      path: 'C:\\notes\\native.md',
    });
    expect(screen.getAllByRole('button', { name: /native\.md line/i })).toHaveLength(2);
  });
});
