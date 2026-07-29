import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ThemeExplorer from './ThemeExplorer';

vi.mock('react-syntax-highlighter', () => ({
    Prism: ({ children }) => <pre>{children}</pre>,
}));

const ThemeExplorerHarness = ({ onStyleChange = vi.fn(), onModeChange = vi.fn() }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [style, setStyle] = useState('workbench');
    const [mode, setMode] = useState('dark');
    const [codeTheme, setCodeTheme] = useState('VS Code Dark');

    return (
        <>
            <button type="button" onClick={() => setIsOpen(true)}>Open appearance</button>
            <ThemeExplorer
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                currentTheme={mode}
                onThemeChange={(nextMode) => {
                    onModeChange(nextMode);
                    setMode(nextMode);
                }}
                currentCodeTheme={codeTheme}
                onCodeThemeChange={setCodeTheme}
                currentWorkspaceStyle={style}
                onWorkspaceStyleChange={(nextStyle) => {
                    onStyleChange(nextStyle);
                    setStyle(nextStyle);
                }}
            />
        </>
    );
};

describe('ThemeExplorer', () => {
    it('selects all three workspace styles independently from both color modes', () => {
        const onStyleChange = vi.fn();
        const onModeChange = vi.fn();
        render(<ThemeExplorerHarness onStyleChange={onStyleChange} onModeChange={onModeChange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Open appearance' }));

        const styleGroup = screen.getByRole('group', { name: 'Workspace style' });
        const modeGroup = screen.getByRole('group', { name: 'Color mode' });

        for (const style of ['Reading Room', 'Operator', 'Workbench']) {
            const selected = within(styleGroup).getByRole('radio', { name: new RegExp(`^${style}`) });
            fireEvent.click(selected);
            expect(selected).toBeChecked();
            expect(selected).toHaveAttribute('tabindex', '0');
            for (const radio of within(styleGroup).getAllByRole('radio')) {
                if (radio !== selected) expect(radio).toHaveAttribute('tabindex', '-1');
            }
        }

        for (const mode of ['Light', 'Dark']) {
            const selected = within(modeGroup).getByRole('radio', { name: mode });
            fireEvent.click(selected);
            expect(selected).toBeChecked();
            expect(selected).toHaveAttribute('tabindex', '0');
            for (const radio of within(modeGroup).getAllByRole('radio')) {
                if (radio !== selected) expect(radio).toHaveAttribute('tabindex', '-1');
            }
        }

        expect(onStyleChange.mock.calls.map(([value]) => value)).toEqual(['reading', 'operator', 'workbench']);
        expect(onModeChange.mock.calls.map(([value]) => value)).toEqual(['light', 'dark']);
    });

    it('shows the Reading Room Light preservation cue', () => {
        render(<ThemeExplorerHarness />);
        fireEvent.click(screen.getByRole('button', { name: 'Open appearance' }));

        fireEvent.click(screen.getByRole('radio', { name: /^Reading Room/ }));
        fireEvent.click(screen.getByRole('radio', { name: 'Light' }));

        expect(screen.getByText(/Preserved reference: white paper/)).toBeVisible();
        expect(screen.getByText('Selected: Reading Room · Light')).toBeVisible();
    });

    it('focuses the selected style and restores focus after Escape', () => {
        render(<ThemeExplorerHarness />);
        const trigger = screen.getByRole('button', { name: 'Open appearance' });

        trigger.focus();
        fireEvent.click(trigger);
        expect(screen.getByRole('radio', { name: /^Workbench/ })).toHaveFocus();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: 'Appearance' })).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it('keeps code theme selection keyboard-accessible', () => {
        render(<ThemeExplorerHarness />);
        fireEvent.click(screen.getByRole('button', { name: 'Open appearance' }));

        const codeTheme = screen.getByRole('radio', { name: 'Dracula' });
        const previousTheme = screen.getByRole('radio', { name: 'VS Code Dark' });
        fireEvent.click(codeTheme);

        expect(codeTheme).toBeChecked();
        expect(codeTheme).toHaveAttribute('tabindex', '0');
        expect(previousTheme).toHaveAttribute('tabindex', '-1');
        for (const radio of screen.getByRole('group', { name: 'Code syntax theme' }).querySelectorAll('input[type="radio"]')) {
            if (radio !== codeTheme) expect(radio).toHaveAttribute('tabindex', '-1');
        }
    });

    it('uses an accessible SVG close control and closes from the overlay', () => {
        render(<ThemeExplorerHarness />);
        fireEvent.click(screen.getByRole('button', { name: 'Open appearance' }));

        const closeButton = screen.getByRole('button', { name: 'Close appearance' });
        expect(closeButton.querySelector('svg')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('dialog', { name: 'Appearance' }).parentElement);
        expect(screen.queryByRole('dialog', { name: 'Appearance' })).not.toBeInTheDocument();
    });

    it('wraps focus forward and backward within the dialog', () => {
        render(<ThemeExplorerHarness />);
        fireEvent.click(screen.getByRole('button', { name: 'Open appearance' }));
        const first = screen.getByRole('button', { name: 'Close appearance' });
        const last = screen.getByRole('radio', { name: 'VS Code Dark' });
        expect(last).toBeChecked();
        expect(last).toHaveAttribute('tabindex', '0');

        last.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(first).toHaveFocus();

        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(last).toHaveFocus();
    });

    it('provides a first-option roving fallback when a radio group has no checked value', () => {
        render(
            <ThemeExplorer
                isOpen
                onClose={vi.fn()}
                currentTheme="unsupported"
                onThemeChange={vi.fn()}
                currentCodeTheme="unsupported"
                onCodeThemeChange={vi.fn()}
                currentWorkspaceStyle="unsupported"
                onWorkspaceStyleChange={vi.fn()}
            />,
        );

        expect(screen.getByRole('radio', { name: /^Workbench/ })).not.toBeChecked();
        expect(screen.getByRole('radio', { name: /^Workbench/ })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('tabindex', '0');
        expect(screen.getAllByRole('group', { name: 'Code syntax theme' })[0].querySelector('input[type="radio"]'))
            .toHaveAttribute('tabindex', '0');
    });
});
