import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

// Mock react-virtuoso since it relies on resize observers which might be tricky in jsdom
vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ itemContent, totalCount }) => (
        <div>
            {Array.from({ length: totalCount }).map((_, index) => (
                <div key={index}>{itemContent(index)}</div>
            ))}
        </div>
    ),
}));

describe('Sidebar', () => {
    const mockFiles = [
        { name: 'test1.md', path: '/test1.md' },
        { name: 'test2.md', path: '/test2.md' },
    ];
    const mockAssets = [];
    const mockProps = {
        files: mockFiles,
        assets: mockAssets,
        loading: false,
        ignorePatterns: [],
        currentFile: null,
        onFileSelect: vi.fn(),
        onInsertImage: vi.fn(),
        onRefresh: vi.fn(),
        onAddIgnore: vi.fn(),
        onRemoveIgnore: vi.fn(),
        onOpenFolder: vi.fn(),
        onOpenFileExternal: vi.fn(),
    };

    it('renders file list', () => {
        render(<Sidebar {...mockProps} />);
        expect(screen.getByRole('button', { name: /01 test1\.md/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /test2\.md/i })).toBeInTheDocument();
    });

    it('filters files', () => {
        render(<Sidebar {...mockProps} />);
        const input = screen.getByPlaceholderText('Filter files...');
        fireEvent.change(input, { target: { value: 'test1' } });

        expect(screen.getByRole('button', { name: /test1\.md/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /test2\.md/i })).not.toBeInTheDocument();
    });

    it('calls onFileSelect when a file is clicked', () => {
        render(<Sidebar {...mockProps} />);
        fireEvent.click(screen.getByRole('button', { name: /test1\.md/i }));
        expect(mockProps.onFileSelect).toHaveBeenCalledWith(mockFiles[0]);
    });

    it('delegates standalone file opening to the platform-aware handler', () => {
        render(<Sidebar {...mockProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Open Markdown file' }));
        expect(mockProps.onOpenFileExternal).toHaveBeenCalledOnce();
    });

    it('supports a controlled navigator section', () => {
        const onActiveSectionChange = vi.fn();
        render(
            <Sidebar
                {...mockProps}
                activeSection="outline"
                headings={[{ text: 'Introduction', level: 1, line: 1 }]}
                onActiveSectionChange={onActiveSectionChange}
            />,
        );

        expect(screen.getByRole('tab', { name: /Outline/i })).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('tab', { name: /Files/i }));
        expect(onActiveSectionChange).toHaveBeenCalledWith('files');
        expect(screen.getByRole('tab', { name: /Outline/i })).toHaveAttribute('aria-selected', 'true');
    });
});
