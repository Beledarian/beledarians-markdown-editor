import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WORKSPACE_STYLES,
  DEFAULT_WORKSPACE_PREFERENCE,
  resolveWorkspacePreset,
  loadWorkspacePreference,
  saveWorkspacePreference,
} from './presets.js';

describe('WORKSPACE_STYLES', () => {
  it('defines valid workspace styles with layout and density', () => {
    expect(WORKSPACE_STYLES).toEqual({
      workbench: { layout: 'split-workbench', density: 'compact' },
      reading: { layout: 'focus-canvas', density: 'comfortable' },
      operator: { layout: 'command-proof', density: 'dense' },
    });
  });
});

describe('DEFAULT_WORKSPACE_PREFERENCE', () => {
  it('has expected default schema', () => {
    expect(DEFAULT_WORKSPACE_PREFERENCE).toEqual({
      version: 1,
      workspaceStyle: 'workbench',
      colorMode: 'dark',
      paneSizes: {
        'split-workbench': [0.48, 0.52],
        'command-proof': [0.64, 0.36],
      },
    });
  });
});

describe('resolveWorkspacePreset', () => {
  it('returns default fallback when given null, undefined, or non-object', () => {
    expect(resolveWorkspacePreset(null)).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
    expect(resolveWorkspacePreset(undefined)).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
    expect(resolveWorkspacePreset('string')).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
    expect(resolveWorkspacePreset(123)).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
  });

  it('preserves valid preferences', () => {
    const valid = {
      version: 1,
      workspaceStyle: 'reading',
      colorMode: 'light',
      paneSizes: {
        'split-workbench': [0.5, 0.5],
      },
    };

    const resolved = resolveWorkspacePreset(valid);
    expect(resolved).toEqual({
      version: 1,
      workspaceStyle: 'reading',
      colorMode: 'light',
      paneSizes: {
        'split-workbench': [0.5, 0.5],
        'command-proof': [0.64, 0.36],
      },
    });
  });

  it('falls back to default workspaceStyle if invalid', () => {
    const pref = { workspaceStyle: 'unknown-style', colorMode: 'light' };
    const resolved = resolveWorkspacePreset(pref);
    expect(resolved.workspaceStyle).toBe('workbench');
    expect(resolved.colorMode).toBe('light');
  });

  it('falls back to default colorMode if invalid', () => {
    const pref = { workspaceStyle: 'operator', colorMode: 'invalid-mode' };
    const resolved = resolveWorkspacePreset(pref);
    expect(resolved.workspaceStyle).toBe('operator');
    expect(resolved.colorMode).toBe('dark');
  });

  it('falls back to default version if not a number', () => {
    const pref = { version: '1' };
    const resolved = resolveWorkspacePreset(pref);
    expect(resolved.version).toBe(1);
  });

  it('handles non-object paneSizes gracefully', () => {
    const pref = { paneSizes: 'invalid' };
    const resolved = resolveWorkspacePreset(pref);
    expect(resolved.paneSizes).toEqual(DEFAULT_WORKSPACE_PREFERENCE.paneSizes);
  });
});

describe('loadWorkspacePreference', () => {
  let mockStorage;

  beforeEach(() => {
    const store = {};
    mockStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      store,
    };
  });

  it('returns default preference when storage is missing or invalid object', () => {
    expect(loadWorkspacePreference(null)).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
    expect(loadWorkspacePreference({})).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
  });

  it('returns default preference when storage is empty', () => {
    expect(loadWorkspacePreference(mockStorage)).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
  });

  it('loads valid JSON preference', () => {
    const stored = {
      version: 1,
      workspaceStyle: 'operator',
      colorMode: 'dark',
    };
    mockStorage.store['workspace_preference'] = JSON.stringify(stored);

    const loaded = loadWorkspacePreference(mockStorage);
    expect(loaded.workspaceStyle).toBe('operator');
    expect(loaded.colorMode).toBe('dark');
  });

  it('migrates legacy string "dark" in workspace_preference', () => {
    mockStorage.store['workspace_preference'] = 'dark';
    const loaded = loadWorkspacePreference(mockStorage);
    expect(loaded).toEqual({
      version: 1,
      workspaceStyle: 'workbench',
      colorMode: 'dark',
      paneSizes: {
        'split-workbench': [0.48, 0.52],
        'command-proof': [0.64, 0.36],
      },
    });
  });

  it('migrates legacy string "light" in workspace_preference', () => {
    mockStorage.store['workspace_preference'] = 'light';
    const loaded = loadWorkspacePreference(mockStorage);
    expect(loaded).toEqual({
      version: 1,
      workspaceStyle: 'reading',
      colorMode: 'light',
      paneSizes: {
        'split-workbench': [0.48, 0.52],
        'command-proof': [0.64, 0.36],
      },
    });
  });

  it('migrates legacy md-theme "dark" when workspace_preference is missing', () => {
    mockStorage.store['md-theme'] = 'dark';
    const loaded = loadWorkspacePreference(mockStorage);
    expect(loaded).toEqual({
      version: 1,
      workspaceStyle: 'workbench',
      colorMode: 'dark',
      paneSizes: {
        'split-workbench': [0.48, 0.52],
        'command-proof': [0.64, 0.36],
      },
    });
  });

  it('migrates legacy theme "dark" when workspace_preference is missing', () => {
    mockStorage.store['theme'] = 'dark';
    const loaded = loadWorkspacePreference(mockStorage);
    expect(loaded).toEqual({
      version: 1,
      workspaceStyle: 'workbench',
      colorMode: 'dark',
      paneSizes: {
        'split-workbench': [0.48, 0.52],
        'command-proof': [0.64, 0.36],
      },
    });
  });

  it('migrates legacy theme "light" when workspace_preference is missing', () => {
    mockStorage.store['theme'] = 'light';
    const loaded = loadWorkspacePreference(mockStorage);
    expect(loaded).toEqual({
      version: 1,
      workspaceStyle: 'reading',
      colorMode: 'light',
      paneSizes: {
        'split-workbench': [0.48, 0.52],
        'command-proof': [0.64, 0.36],
      },
    });
  });

  it('returns default preference on JSON parse error', () => {
    mockStorage.store['workspace_preference'] = '{ invalid json ';
    const loaded = loadWorkspacePreference(mockStorage);
    expect(loaded).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
  });

  it('returns default preference when getItem throws an exception', () => {
    const errorStorage = {
      getItem: () => {
        throw new Error('Storage disabled');
      },
    };
    expect(loadWorkspacePreference(errorStorage)).toEqual(DEFAULT_WORKSPACE_PREFERENCE);
  });
});

describe('saveWorkspacePreference', () => {
  let mockStorage;

  beforeEach(() => {
    const store = {};
    mockStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = String(value);
      }),
      store,
    };
  });

  it('handles missing or invalid storage gracefully', () => {
    expect(() => saveWorkspacePreference({}, null)).not.toThrow();
    expect(() => saveWorkspacePreference({}, {})).not.toThrow();
  });

  it('saves resolved workspace preference to storage as JSON', () => {
    const pref = {
      workspaceStyle: 'operator',
      colorMode: 'light',
    };

    saveWorkspacePreference(pref, mockStorage);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'workspace_preference',
      JSON.stringify({
        version: 1,
        workspaceStyle: 'operator',
        colorMode: 'light',
        paneSizes: {
          'split-workbench': [0.48, 0.52],
          'command-proof': [0.64, 0.36],
        },
      })
    );
  });
});
