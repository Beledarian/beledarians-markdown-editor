import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 150));
    expect(result.current).toBe('hello');
  });

  it('updates value after specified delay', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 150), {
      initialProps: { val: 'initial' },
    });

    expect(result.current).toBe('initial');

    rerender({ val: 'updated' });
    expect(result.current).toBe('initial'); // Not updated yet

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current).toBe('updated');
    vi.useRealTimers();
  });
});
