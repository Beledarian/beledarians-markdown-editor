import { describe, it, expect } from 'vitest';
import { sanitizePreferences, DEFAULT_PREFERENCES } from './preferences';

describe('sanitizePreferences', () => {
  it('returns default preferences when passed empty or invalid input', () => {
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({})).toEqual(DEFAULT_PREFERENCES);
  });

  it('validates allowed theme and workspaceStyle values', () => {
    const sanitized = sanitizePreferences({
      theme: 'invalid-theme',
      workspaceStyle: 'invalid-style',
      fontSize: 20
    });

    expect(sanitized.theme).toBe('dark');
    expect(sanitized.workspaceStyle).toBe('workbench');
    expect(sanitized.fontSize).toBe(20);
  });

  it('migrates unknown and legacy code themes to a renderable default', () => {
    expect(sanitizePreferences({ codeTheme: 'oneDark' }).codeTheme).toBe('VS Code Dark');
    expect(sanitizePreferences({ codeTheme: 'not-a-theme' }).codeTheme).toBe('VS Code Dark');
    expect(sanitizePreferences({ codeTheme: 'Dracula' }).codeTheme).toBe('Dracula');
  });

  it('filters out injected unvalidated object keys', () => {
    const rawWithInjection = {
      theme: 'light',
      maliciousPayload: '<script>alert(1)</script>',
      extraField: 'should be stripped'
    };

    const sanitized = sanitizePreferences(rawWithInjection);
    expect(sanitized.theme).toBe('light');
    expect(sanitized).not.toHaveProperty('maliciousPayload');
    expect(sanitized).not.toHaveProperty('extraField');
  });
});
