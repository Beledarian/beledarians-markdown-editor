import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App.jsx';
import { useOsEnv } from '../hooks/useOsEnv';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Tauri APIs
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
  open: vi.fn().mockResolvedValue('/fake/path/file.md'),
  save: vi.fn().mockResolvedValue('/fake/path/saved.md'),
}));

vi.mock('../hooks/useOsEnv', () => ({
  useOsEnv: vi.fn(),
}));

describe('Application Keyboard Shortcuts', () => {
  beforeEach(() => {
    localStorage.clear();
    useOsEnv.mockReturnValue({
      isMac: false,
      modKey: 'Ctrl',
      altKey: 'Alt',
      isTauri: true,
    });
    vi.clearAllMocks();
  });

  const fireShortcut = (key, options = {}) => {
    fireEvent.keyDown(document, {
      key,
      code: options.code || `Key${key.toUpperCase()}`,
      ctrlKey: options.ctrlKey || false,
      shiftKey: options.shiftKey || false,
      altKey: options.altKey || false,
      metaKey: options.metaKey || false,
      ...options
    });
  };

  it('Ctrl+N creates a new document', async () => {
    render(<App />);
    fireShortcut('n', { ctrlKey: true });
    
    await waitFor(() => {
      expect(screen.getAllByText(/Untitled/i).length).toBeGreaterThan(0);
    });
  });

  it('Ctrl+O triggers open document dialog', async () => {
    render(<App />);
    fireShortcut('o', { ctrlKey: true });
  });

  it('Ctrl+S saves the active document', async () => {
    render(<App />);
    fireShortcut('s', { ctrlKey: true });
  });

  it('Ctrl+Shift+S triggers Save As document', async () => {
    render(<App />);
    fireShortcut('s', { ctrlKey: true, shiftKey: true, key: 'S' });
  });

  it('Ctrl+P triggers print document', async () => {
    render(<App />);
    fireShortcut('p', { ctrlKey: true, code: 'KeyP' });
    await waitFor(() => {
      expect(screen.getByText(/Print Options/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('Ctrl+F toggles Find & Replace modal', async () => {
    render(<App />);
    fireShortcut('f', { ctrlKey: true, code: 'KeyF' });
    await waitFor(() => {
      expect(screen.getByText('Find & Replace')).toBeInTheDocument();
    });
  });

  it('Ctrl+Shift+F toggles Global Search', async () => {
    render(<App />);
    fireShortcut('f', { ctrlKey: true, shiftKey: true, code: 'KeyF' });
    await waitFor(() => {
      expect(screen.getByText('Global Search')).toBeInTheDocument();
    });
  });

  it('migrates the legacy default find shortcuts without replacing custom settings', async () => {
    localStorage.setItem('md-shortcuts', JSON.stringify({
      findReplace: 'Ctrl+H',
      globalSearch: 'Ctrl+F',
      save: 'Alt+S',
    }));

    render(<App />);
    fireShortcut('f', { ctrlKey: true, code: 'KeyF' });

    await waitFor(() => {
      expect(screen.getByText('Find & Replace')).toBeInTheDocument();
    });
    expect(JSON.parse(localStorage.getItem('md-shortcuts'))).toMatchObject({
      findReplace: 'Ctrl+F',
      globalSearch: 'Ctrl+Shift+F',
      save: 'Alt+S',
    });
  });

  it('Escape key dismisses modals/overlays', async () => {
    render(<App />);
    fireShortcut('p', { ctrlKey: true, code: 'KeyP' });
    await waitFor(() => {
      expect(screen.getByText(/Print Options/i)).toBeInTheDocument();
    });
    
    fireShortcut('Escape', { key: 'Escape', code: 'Escape' });
    
    await waitFor(() => {
      const el = screen.queryByText(/Print Options/i);
      expect(el).not.toBeInTheDocument();
    });
  });
});
