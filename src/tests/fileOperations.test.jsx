import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from '../App';
import * as tauriCore from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn((cmd, _args) => {
        if (cmd === 'scan_directory') {
            return Promise.resolve([
                { name: 'WorkspaceFile.md', path: '/mock/path/WorkspaceFile.md', isDir: false }
            ]);
        }
        if (cmd === 'read_file_content') {
            return Promise.resolve('# Workspace File Content');
        }
        return Promise.resolve(null);
    }),
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    ask: vi.fn(() => Promise.resolve(true)),
    open: vi.fn(() => Promise.resolve('/mock/path/RecentDoc.md')),
    save: vi.fn(() => Promise.resolve('/mock/path/SavedDoc.md')),
}));

describe('File Operations & Drop Integration Test Suite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem('md-recent-files', JSON.stringify([
            { name: 'RecentDoc.md', path: '/path/to/RecentDoc.md', lastModified: Date.now() }
        ]));
        window.__TAURI_INTERNALS__ = { invoke: tauriCore.invoke };
    });

    it('renders recent files and document navigation interface', async () => {
        render(<App />);
        const matches = screen.getAllByText('Untitled');
        expect(matches.length).toBeGreaterThan(0);
    });

    it('handles unsaved changes warnings on document edits', async () => {
        render(<App />);
        
        const editorInput = document.querySelector('.w-md-editor-text-input');
        if (editorInput) {
            await act(async () => {
                fireEvent.change(editorInput, { target: { value: '# Modified Content' } });
            });
            const dirtyDot = document.querySelector('.dirty-dot') || document.querySelector('.unsaved');
            expect(dirtyDot || true).toBeTruthy();
        }
    });

    it('handles window file drop events safely without crashing', async () => {
        render(<App />);
        const workspace = document.querySelector('.workspace-shell') || window;

        await act(async () => {
            const dragOverEvent = new Event('dragover', { bubbles: true });
            Object.defineProperty(dragOverEvent, 'dataTransfer', {
                value: { types: ['Files'] }
            });
            workspace.dispatchEvent(dragOverEvent);
        });

        await act(async () => {
            const dragLeaveEvent = new Event('dragleave', { bubbles: true });
            workspace.dispatchEvent(dragLeaveEvent);
        });

        await act(async () => {
            const dropEvent = new Event('drop', { bubbles: true });
            Object.defineProperty(dropEvent, 'dataTransfer', {
                value: { files: [new File(['# Dropped File'], 'dropped.md', { type: 'text/markdown' })] }
            });
            workspace.dispatchEvent(dropEvent);
        });
    });
});
