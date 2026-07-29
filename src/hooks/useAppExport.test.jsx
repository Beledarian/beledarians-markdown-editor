import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppExport } from './useAppExport';

describe('useAppExport', () => {
  it('initializes showPrintModal as false and toggles via handleExportPDF', () => {
    const { result } = renderHook(() => useAppExport({
      markdown: '# Test',
      theme: 'dark'
    }));

    expect(result.current.showPrintModal).toBe(false);

    act(() => {
      result.current.handleExportPDF();
    });

    expect(result.current.showPrintModal).toBe(true);
  });

  it('provides copyToClipboard and handleCopyHTML without throwing errors', () => {
    const { result } = renderHook(() => useAppExport({
      markdown: '# Test',
      theme: 'dark'
    }));

    expect(typeof result.current.copyToClipboard).toBe('function');
    expect(typeof result.current.handleCopyHTML).toBe('function');
    expect(typeof result.current.handleExportHTML).toBe('function');
    expect(typeof result.current.handlePrintConfirm).toBe('function');
  });
});
