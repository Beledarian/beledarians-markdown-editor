export const WORKSPACE_STYLES = {
  workbench: { layout: 'split-workbench', density: 'compact' },
  reading: { layout: 'focus-canvas', density: 'comfortable' },
  operator: { layout: 'command-proof', density: 'dense' },
};

export const DEFAULT_WORKSPACE_PREFERENCE = {
  version: 1,
  workspaceStyle: 'workbench',
  colorMode: 'dark',
  paneSizes: {
    'split-workbench': [0.48, 0.52],
    'command-proof': [0.64, 0.36],
  },
};

export function resolveWorkspacePreset(pref) {
  if (!pref || typeof pref !== 'object') {
    return DEFAULT_WORKSPACE_PREFERENCE;
  }

  const workspaceStyle = WORKSPACE_STYLES[pref.workspaceStyle]
    ? pref.workspaceStyle
    : DEFAULT_WORKSPACE_PREFERENCE.workspaceStyle;

  const colorMode =
    pref.colorMode === 'light' || pref.colorMode === 'dark'
      ? pref.colorMode
      : DEFAULT_WORKSPACE_PREFERENCE.colorMode;

  const paneSizes =
    pref.paneSizes && typeof pref.paneSizes === 'object'
      ? { ...DEFAULT_WORKSPACE_PREFERENCE.paneSizes, ...pref.paneSizes }
      : DEFAULT_WORKSPACE_PREFERENCE.paneSizes;

  const version =
    typeof pref.version === 'number'
      ? pref.version
      : DEFAULT_WORKSPACE_PREFERENCE.version;

  return {
    version,
    workspaceStyle,
    colorMode,
    paneSizes,
  };
}

export function loadWorkspacePreference(storage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return DEFAULT_WORKSPACE_PREFERENCE;
  }

  try {
    const raw = storage.getItem('workspace_preference');
    if (!raw) {
      // Check legacy theme storage or string fallback
      const legacyTheme = storage.getItem('md-theme') || storage.getItem('theme');
      if (legacyTheme === 'light') {
        return resolveWorkspacePreset({
          workspaceStyle: 'reading',
          colorMode: 'light',
        });
      } else if (legacyTheme === 'dark') {
        return resolveWorkspacePreset({
          workspaceStyle: 'workbench',
          colorMode: 'dark',
        });
      }
      return DEFAULT_WORKSPACE_PREFERENCE;
    }

    // raw might be a simple legacy string or JSON object string
    if (raw === 'dark') {
      return resolveWorkspacePreset({
        workspaceStyle: 'workbench',
        colorMode: 'dark',
      });
    }
    if (raw === 'light') {
      return resolveWorkspacePreset({
        workspaceStyle: 'reading',
        colorMode: 'light',
      });
    }

    const parsed = JSON.parse(raw);
    return resolveWorkspacePreset(parsed);
  } catch {
    return DEFAULT_WORKSPACE_PREFERENCE;
  }
}

export function saveWorkspacePreference(pref, storage) {
  if (!storage || typeof storage.setItem !== 'function') {
    return;
  }

  const validPref = resolveWorkspacePreset(pref);
  storage.setItem('workspace_preference', JSON.stringify(validPref));
}
