import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Toolbar from './Toolbar';
import StatusBar from './StatusBar';
import TabBar from './TabBar';

const toolbarProps = () => ({
  sidebarOpen: true,
  setSidebarOpen: vi.fn(),
  savedHandle: null,
  dirHandle: null,
  handleRestoreFolder: vi.fn(),
  handleOpenFile: vi.fn(),
  handleSaveFile: vi.fn(),
  handleSaveAs: vi.fn(),
  handleExportHTML: vi.fn(),
  handleExportPDF: vi.fn(),
  copyToClipboard: vi.fn(),
  handleColorChange: vi.fn(),
  handleHighlight: vi.fn(),
  theme: 'dark',
  toggleTheme: vi.fn(),
  workspaceStyle: 'reading',
  setWorkspaceStyle: vi.fn(),
  setShowSettings: vi.fn(),
  setShowCheatSheet: vi.fn(),
  zenMode: false,
  setZenMode: vi.fn(),
  fontSize: 16,
  setFontSize: vi.fn(),
  autoSaveEnabled: true,
  setAutoSaveEnabled: vi.fn(),
  shortcuts: {},
  onFileLoad: vi.fn(),
  handleCopyHTML: vi.fn(),
  handleInsertTemplate: vi.fn(),
  templates: [],
  typewriterMode: false,
  setTypewriterMode: vi.fn(),
  focusMode: false,
  setFocusMode: vi.fn(),
  vimMode: false,
  setVimMode: vi.fn(),
  showMiniMap: false,
  setShowMiniMap: vi.fn(),
  scrollSynced: true,
  setScrollSynced: vi.fn(),
});

describe('workspace chrome', () => {
  it('exposes the controlled editor view modes using UIW-compatible values', () => {
    const props = toolbarProps();
    props.viewMode = 'preview';
    props.setViewMode = vi.fn();
    render(<Toolbar {...props} />);

    const viewModes = screen.getByRole('group', { name: 'View mode' });
    expect(within(viewModes).getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(viewModes).getByRole('button', { name: 'Split' }));
    expect(props.setViewMode).toHaveBeenCalledWith('live');
  });

  it('keeps primary toolbar actions and state controls wired', () => {
    const props = toolbarProps();
    render(<Toolbar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Markdown file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Markdown copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Theme' }));
    fireEvent.change(screen.getByLabelText('Workspace Style'), { target: { value: 'operator' } });

    expect(props.handleOpenFile).toHaveBeenCalledOnce();
    expect(props.handleSaveFile).toHaveBeenCalledOnce();
    expect(props.handleSaveAs).toHaveBeenCalledOnce();
    expect(props.toggleTheme).toHaveBeenCalledOnce();
    expect(props.setWorkspaceStyle).toHaveBeenCalledWith('operator');
  });

  it('keeps Save and Export available in the quiet Reading Room chrome', () => {
    const props = toolbarProps();
    render(<Toolbar {...props} />);

    expect(screen.getByRole('button', { name: 'Save file' })).toBeVisible();
    const exportControl = screen.getByLabelText('Export and copy actions');
    expect(exportControl).toBeVisible();
    expect(exportControl.closest('details')).toHaveClass('export-menu');
  });

  it('renders truthful status text and keeps timestamp insertion available', () => {
    const handleInsertTimestamp = vi.fn();
    render(
      <StatusBar
        currentFile={{ name: 'README.md' }}
        unsavedChanges
        isSaving={false}
        lineCount={12}
        wordCount={240}
        wordGoal={200}
        charCount={1200}
        readingTime={2}
        handleInsertTimestamp={handleInsertTimestamp}
        shortcuts={{}}
        cursorPos={{ line: 8, col: 4 }}
      />,
    );

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByText('File README.md')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Insert Timestamp' }));
    expect(handleInsertTimestamp).toHaveBeenCalledOnce();
  });

  it('distinguishes local drafts and downloaded copies from writable disk files', () => {
    const { rerender } = render(
      <StatusBar
        currentFile={{ name: 'Untitled.md', storageKind: 'draft' }}
        unsavedChanges={false}
        isSaving={false}
        lineCount={1}
        wordCount={0}
        wordGoal={0}
        charCount={0}
        readingTime={0}
        handleInsertTimestamp={vi.fn()}
      />,
    );

    expect(screen.getByText('Saved locally')).toBeInTheDocument();

    rerender(
      <StatusBar
        currentFile={{ name: 'Untitled.md', storageKind: 'draft', lastSaveKind: 'download' }}
        unsavedChanges={false}
        isSaving={false}
        lineCount={1}
        wordCount={0}
        wordGoal={0}
        charCount={0}
        readingTime={0}
        handleInsertTimestamp={vi.fn()}
      />,
    );

    expect(screen.getByText('Downloaded copy')).toBeInTheDocument();

    rerender(
      <StatusBar
        currentFile={{ name: 'phone-note.md', storageKind: 'web-import' }}
        unsavedChanges={false}
        isSaving={false}
        lineCount={1}
        wordCount={0}
        wordGoal={0}
        charCount={0}
        readingTime={0}
        handleInsertTimestamp={vi.fn()}
      />,
    );

    expect(screen.getByText('Opened copy')).toBeInTheDocument();
  });

  it('preserves tab selection, close, and unsaved semantics', () => {
    const onTabClick = vi.fn();
    const onTabClose = vi.fn();
    render(
      <TabBar
        tabs={[
          { path: '/README.md', name: 'README.md', unsaved: true },
          { path: '/notes.md', name: 'notes.md', unsaved: false },
        ]}
        activeTabId="/README.md"
        onTabClick={onTabClick}
        onTabClose={onTabClose}
      />,
    );

    const activeTab = screen.getByRole('tab', { name: /README\.md/i });
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    expect(within(activeTab).getByLabelText('unsaved changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close README.md' }));
    expect(onTabClose).toHaveBeenCalledWith('/README.md');
  });
});
