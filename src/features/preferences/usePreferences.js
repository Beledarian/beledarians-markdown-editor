import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_PREFERENCES, PREFERENCE_KEYS, sanitizePreferences } from './preferences';

export const usePreferences = () => {
  const [preferences, setPreferencesState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(PREFERENCE_KEYS.theme);
      const savedCodeTheme = localStorage.getItem(PREFERENCE_KEYS.codeTheme);
      const savedStyle = localStorage.getItem(PREFERENCE_KEYS.workspaceStyle);
      const savedFontSize = localStorage.getItem(PREFERENCE_KEYS.fontSize);
      const savedWordGoal = localStorage.getItem(PREFERENCE_KEYS.wordGoal);
      const savedMiniMap = localStorage.getItem(PREFERENCE_KEYS.showMiniMap);

      return sanitizePreferences({
        theme: savedTheme || DEFAULT_PREFERENCES.theme,
        codeTheme: savedCodeTheme || DEFAULT_PREFERENCES.codeTheme,
        workspaceStyle: savedStyle || DEFAULT_PREFERENCES.workspaceStyle,
        fontSize: savedFontSize ? parseInt(savedFontSize, 10) : DEFAULT_PREFERENCES.fontSize,
        wordGoal: savedWordGoal ? parseInt(savedWordGoal, 10) : DEFAULT_PREFERENCES.wordGoal,
        showMiniMap: savedMiniMap !== null ? savedMiniMap === 'true' : DEFAULT_PREFERENCES.showMiniMap
      });
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const updatePreference = useCallback((key, value) => {
    setPreferencesState(prev => {
      const next = sanitizePreferences({ ...prev, [key]: value });
      try {
        if (key === 'theme') localStorage.setItem(PREFERENCE_KEYS.theme, next.theme);
        if (key === 'codeTheme') localStorage.setItem(PREFERENCE_KEYS.codeTheme, next.codeTheme);
        if (key === 'workspaceStyle') localStorage.setItem(PREFERENCE_KEYS.workspaceStyle, next.workspaceStyle);
        if (key === 'fontSize') localStorage.setItem(PREFERENCE_KEYS.fontSize, String(next.fontSize));
        if (key === 'wordGoal') localStorage.setItem(PREFERENCE_KEYS.wordGoal, String(next.wordGoal));
        if (key === 'showMiniMap') localStorage.setItem(PREFERENCE_KEYS.showMiniMap, String(next.showMiniMap));
      } catch {
        // Ignored storage quota errors
      }
      return next;
    });
  }, []);

  const setTheme = useCallback((value) => updatePreference('theme', value), [updatePreference]);
  const setCodeTheme = useCallback((value) => updatePreference('codeTheme', value), [updatePreference]);
  const setWorkspaceStyle = useCallback((value) => updatePreference('workspaceStyle', value), [updatePreference]);
  const setFontSize = useCallback((value) => updatePreference('fontSize', value), [updatePreference]);
  const setWordGoal = useCallback((value) => updatePreference('wordGoal', value), [updatePreference]);
  const setShowMiniMap = useCallback((value) => updatePreference('showMiniMap', value), [updatePreference]);
  const setZenMode = useCallback((value) => updatePreference('zenMode', value), [updatePreference]);
  const setFocusMode = useCallback((value) => updatePreference('focusMode', value), [updatePreference]);
  const setTypewriterMode = useCallback((value) => updatePreference('typewriterMode', value), [updatePreference]);
  const setViewMode = useCallback((value) => updatePreference('viewMode', value), [updatePreference]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preferences.theme);
    document.documentElement.setAttribute('data-color-mode', preferences.theme);
  }, [preferences.theme]);

  return {
    preferences,
    updatePreference,
    setTheme,
    setCodeTheme,
    setWorkspaceStyle,
    setFontSize,
    setWordGoal,
    setShowMiniMap,
    setZenMode,
    setFocusMode,
    setTypewriterMode,
    setViewMode
  };
};
