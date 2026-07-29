const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Pure function to construct a standalone HTML document string from rendered markdown HTML.
 */
export const buildFullHtmlDocument = ({ htmlContent = '', theme = 'dark', cssContent = '', highlightCss = '', katexCss = '', title = 'Markdown Preview' }) => {
  const safeTheme = escapeHtml(theme);
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html data-theme="${safeTheme}">
  <head>
    <meta charset="utf-8">
    <title>${safeTitle}</title>
    <style>
      ${cssContent}
      ${highlightCss}
      ${katexCss}
      body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: var(--bg-color); color: var(--text-color); font-family: var(--font-family); }
      .preview { width: 80%; max-width: 800px; background-color: var(--modal-bg); padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
      img { max-width: 100%; }
    </style>
  </head>
  <body><div class="preview">${htmlContent || ''}</div></body>
</html>`;
};
