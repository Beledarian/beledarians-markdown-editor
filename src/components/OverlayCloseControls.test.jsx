import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CheatSheetModal from './CheatSheetModal';
import FindReplaceModal from './FindReplaceModal';
import FloatingFormatMenu from './FloatingFormatMenu';
import GlobalSearchModal from './GlobalSearchModal';
import PrintModal from './PrintModal';

vi.mock('../hooks/useOsEnv', () => ({
  useOsEnv: () => ({ modKey: 'Ctrl', altKey: 'Alt' }),
}));

const expectSvgCloseControl = (name) => {
  const closeButton = screen.getByRole('button', { name });
  expect(closeButton.querySelector('svg')).toBeInTheDocument();
};

describe('legacy overlay close controls', () => {
  it('uses the shared SVG close icon in the Markdown cheat sheet', () => {
    render(<CheatSheetModal isOpen onClose={vi.fn()} />);
    expectSvgCloseControl('Close Markdown cheat sheet');
  });

  it('uses the shared SVG close icon in find and replace', () => {
    render(
      <FindReplaceModal
        isOpen
        onClose={vi.fn()}
        onFind={vi.fn()}
        onReplace={vi.fn()}
        onReplaceAll={vi.fn()}
      />,
    );
    expectSvgCloseControl('Close find and replace');
  });

  it('uses the shared SVG close icon in global search', () => {
    render(
      <GlobalSearchModal
        isOpen
        onClose={vi.fn()}
        files={[]}
        onFileSelect={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expectSvgCloseControl('Close global search');
  });

  it('uses the shared SVG close icon in print options', () => {
    render(<PrintModal isOpen onClose={vi.fn()} onPrint={vi.fn()} />);
    expectSvgCloseControl('Close print options');
  });

  it('uses the shared SVG close icon in the floating format menu', () => {
    render(
      <FloatingFormatMenu
        position={{ x: 0, y: 0 }}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expectSvgCloseControl('Close highlight formatting');
  });
});
