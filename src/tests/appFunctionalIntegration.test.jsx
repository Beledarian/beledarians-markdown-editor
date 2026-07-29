import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from '../App';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    ask: vi.fn(() => Promise.resolve(true)),
    open: vi.fn(() => Promise.resolve(null)),
    save: vi.fn(() => Promise.resolve(null)),
}));

describe('App Functional Integration Test Suite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders the core application shell with active tab and workspace', async () => {
        render(<App />);
        const matches = screen.getAllByText(/Hello, world!/i);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('handles global keyboard shortcuts cleanly', async () => {
        render(<App />);
        
        // Trigger Ctrl+F for Find
        act(() => {
            const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true });
            window.dispatchEvent(event);
        });

        // Trigger Ctrl+N for New File
        act(() => {
            const event = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true });
            window.dispatchEvent(event);
        });
    });

    it('processes drag and drop file drop events without throwing errors', async () => {
        render(<App />);
        const dropZone = window;

        act(() => {
            const dragOverEvent = new Event('dragover', { bubbles: true });
            dropZone.dispatchEvent(dragOverEvent);
        });

        act(() => {
            const dragLeaveEvent = new Event('dragleave', { bubbles: true });
            dropZone.dispatchEvent(dragLeaveEvent);
        });
    });
});
