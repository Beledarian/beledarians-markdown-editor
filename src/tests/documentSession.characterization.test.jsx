import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import App from '../App.jsx';

const platform = vi.hoisted(() => ({
  files: new Map(),
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: platform.invoke,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  ask: vi.fn().mockResolvedValue(true),
}));

vi.mock('../utils/storage', () => ({
  getDirectoryHandle: vi.fn().mockResolvedValue(null),
  saveDirectoryHandle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  });

  return {
    Toaster: () => null,
    toast,
  };
});

vi.mock('@uiw/react-md-editor', () => ({
  default: function CharacterizationEditor({ value, onChange }) {
    return (
      <div className="w-md-editor">
        <textarea
          aria-label="Document content"
          className="w-md-editor-text-input"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  },
}));

function editor() {
  return screen.getByRole('textbox', { name: 'Document content' });
}

function tabNamed(name) {
  const openDocuments = screen.getByRole('tablist', { name: 'Open documents' });
  return within(openDocuments).getAllByRole('tab').find((tab) => within(tab).queryByText(name));
}

async function openExternalFile(path, content) {
  platform.files.set(path, content);

  act(() => {
    window.dispatchEvent(new CustomEvent('open-file', { detail: path }));
  });

  const name = path.replace(/^.*[/\\]/, '');
  await waitFor(() => expect(tabNamed(name)).toHaveAttribute('aria-selected', 'true'));
  await waitFor(() => expect(editor()).toHaveValue(content));
}

describe('document session characterization', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('md-minimap', 'false');
    platform.files.clear();
    platform.invoke.mockReset();
    platform.invoke.mockImplementation((command, args) => {
      if (command === 'read_file') {
        return Promise.resolve(platform.files.get(args.path));
      }
      if (command === 'get_file_last_modified') {
        return Promise.resolve(1_700_000_000_000);
      }
      if (command === 'get_initial_file') {
        return Promise.resolve(null);
      }
      return Promise.resolve();
    });
    delete window.__TAURI_INTERNALS__;
  });

  it('opens and switches multiple tabs while preserving each tab content and dirty state', async () => {
    render(<App />);

    await openExternalFile('C:\\docs\\alpha.md', '# Alpha');
    fireEvent.change(editor(), { target: { value: '# Alpha edited' } });

    // Active edits are dirty immediately; switching tabs must preserve that marker.
    expect(within(tabNamed('alpha.md')).getByLabelText('unsaved changes')).toBeInTheDocument();
    expect(document.querySelector('.status-region')).toHaveTextContent('File alpha.md');
    expect(document.querySelector('.status-region')).toHaveTextContent('Unsaved changes');

    await openExternalFile('C:\\docs\\beta.md', '# Beta');

    expect(
      within(screen.getByRole('tablist', { name: 'Open documents' })).getAllByRole('tab')
    ).toHaveLength(3);
    expect(within(tabNamed('alpha.md')).getByLabelText('unsaved changes')).toBeInTheDocument();

    fireEvent.change(editor(), { target: { value: '# Beta edited' } });
    expect(within(tabNamed('beta.md')).getByLabelText('unsaved changes')).toBeInTheDocument();
    expect(document.querySelector('.status-region')).toHaveTextContent('File beta.md');
    expect(document.querySelector('.status-region')).toHaveTextContent('Unsaved changes');

    fireEvent.click(tabNamed('alpha.md'));

    expect(editor()).toHaveValue('# Alpha edited');
    expect(tabNamed('alpha.md')).toHaveAttribute('aria-selected', 'true');
    expect(within(tabNamed('alpha.md')).getByLabelText('unsaved changes')).toBeInTheDocument();
    expect(within(tabNamed('beta.md')).getByLabelText('unsaved changes')).toBeInTheDocument();

    fireEvent.click(tabNamed('beta.md'));

    expect(editor()).toHaveValue('# Beta edited');
    expect(tabNamed('beta.md')).toHaveAttribute('aria-selected', 'true');
    expect(within(tabNamed('alpha.md')).getByLabelText('unsaved changes')).toBeInTheDocument();
    expect(within(tabNamed('beta.md')).getByLabelText('unsaved changes')).toBeInTheDocument();
  });

  it('closes the active tab and activates the last remaining tab without leaking dirty state', async () => {
    render(<App />);

    await openExternalFile('C:\\docs\\alpha.md', '# Alpha');
    await openExternalFile('C:\\docs\\beta.md', '# Beta');
    fireEvent.change(editor(), { target: { value: '# Beta edited' } });

    fireEvent.click(screen.getByRole('button', { name: 'Close beta.md' }));

    expect(screen.queryByText('beta.md')).not.toBeInTheDocument();
    expect(tabNamed('alpha.md')).toHaveAttribute('aria-selected', 'true');
    expect(editor()).toHaveValue('# Alpha');
    expect(within(tabNamed('alpha.md')).queryByLabelText('unsaved changes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close alpha.md' }));

    expect(tabNamed('Untitled')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Close Untitled' }));

    expect(tabNamed('Untitled')).toHaveAttribute('aria-selected', 'true');
    expect(editor()).toHaveValue('# Hello, world!');
  });
});

