export const DEFAULT_PREFERENCES = {
  theme: 'dark',
  codeTheme: 'VS Code Dark',
  workspaceStyle: 'workbench',
  fontSize: 16,
  wordGoal: 0,
  zenMode: false,
  focusMode: false,
  typewriterMode: false,
  showMiniMap: true,
  viewMode: 'live'
};

const CODE_THEMES = new Set([
  'VS Code Dark',
  'VS Code Light',
  'Dracula',
  'Atom Dark',
  'GitHub',
  'Monokai',
  'Solarized Light',
  'Solarized Dark'
]);

export const PREFERENCE_KEYS = {
  theme: 'md_editor_theme',
  codeTheme: 'md_editor_code_theme',
  workspaceStyle: 'md_editor_workspace_style',
  fontSize: 'md_editor_font_size',
  wordGoal: 'md_editor_word_goal',
  showMiniMap: 'md_editor_show_minimap'
};

export const sanitizePreferences = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFERENCES };

  const theme = ['dark', 'light'].includes(raw.theme) ? raw.theme : DEFAULT_PREFERENCES.theme;
  const workspaceStyle = ['workbench', 'reading-room', 'reading', 'operator'].includes(raw.workspaceStyle)
    ? raw.workspaceStyle
    : DEFAULT_PREFERENCES.workspaceStyle;
  const fontSize = typeof raw.fontSize === 'number' && !isNaN(raw.fontSize) && raw.fontSize >= 10 && raw.fontSize <= 48
    ? raw.fontSize
    : DEFAULT_PREFERENCES.fontSize;
  const codeTheme = typeof raw.codeTheme === 'string' && CODE_THEMES.has(raw.codeTheme)
    ? raw.codeTheme
    : DEFAULT_PREFERENCES.codeTheme;
  const wordGoal = typeof raw.wordGoal === 'number' && !isNaN(raw.wordGoal) && raw.wordGoal >= 0
    ? raw.wordGoal
    : DEFAULT_PREFERENCES.wordGoal;
  const zenMode = Boolean(raw.zenMode);
  const focusMode = Boolean(raw.focusMode);
  const typewriterMode = Boolean(raw.typewriterMode);
  const showMiniMap = raw.showMiniMap !== undefined ? Boolean(raw.showMiniMap) : DEFAULT_PREFERENCES.showMiniMap;
  const viewMode = ['edit', 'preview', 'live'].includes(raw.viewMode) ? raw.viewMode : DEFAULT_PREFERENCES.viewMode;

  return {
    theme,
    codeTheme,
    workspaceStyle,
    fontSize,
    wordGoal,
    zenMode,
    focusMode,
    typewriterMode,
    showMiniMap,
    viewMode
  };
};
