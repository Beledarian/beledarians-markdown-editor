import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { usePreferences } from './usePreferences';

beforeEach(() => {
  localStorage.clear();
});

it('keeps preference setter identities stable across updates', () => {
  const { result } = renderHook(() => usePreferences());
  const initialSetCodeTheme = result.current.setCodeTheme;

  act(() => {
    result.current.setTheme('light');
  });

  expect(result.current.setCodeTheme).toBe(initialSetCodeTheme);
  expect(result.current.preferences.theme).toBe('light');
});
