const DEFAULT_HIGHLIGHT_COLOR = '#ffff00';
const DEFAULT_HIGHLIGHT_OPACITY = 0.5;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const isValidSelection = (markdown, selection) => (
  typeof markdown === 'string'
  && selection !== null
  && typeof selection === 'object'
  && Number.isInteger(selection.start)
  && Number.isInteger(selection.end)
  && selection.start >= 0
  && selection.start <= selection.end
  && selection.end <= markdown.length
);

const buildSyntax = (text, format) => {
  if (!format || !['highlight', 'color'].includes(format.type) || typeof format.color !== 'string') {
    return null;
  }

  if (format.type === 'color') {
    return `{color:${format.color} ${text}}`;
  }

  if (format.color === DEFAULT_HIGHLIGHT_COLOR && format.opacity === DEFAULT_HIGHLIGHT_OPACITY) {
    return `====${text}====`;
  }

  const rgb = hexToRgb(format.color);
  const background = rgb
    ? `rgba(${rgb.r},${rgb.g},${rgb.b},${format.opacity})`
    : format.color;
  return `{bg:${background} ${text}}`;
};

const findInSource = (selectedText, source) => {
  if (!selectedText) return null;
  if (source.includes(selectedText)) return selectedText;

  const escaped = selectedText.replace(/[.*+?^${}()|[\\]/g, '\\$&');
  const noise = '(?:[\\s\\*\\_\\~\\`\\[\\]\\(\\)\\{\\}\\#\\=\\<\\>\\!\\-]|\\{color:[^}]+\\}|\\{bg:[^}]+\\})*';
  const pattern = escaped.split('').join(noise);
  const match = source.match(new RegExp(pattern, 'm'));
  return match ? match[0] : null;
};

export const applyFormatToSelection = (markdown, selection, format) => {
  if (!isValidSelection(markdown, selection)) return null;

  const selectedText = markdown.substring(selection.start, selection.end);
  const syntax = buildSyntax(selectedText, format);
  if (syntax === null) return null;

  return markdown.substring(0, selection.start) + syntax + markdown.substring(selection.end);
};

export const applyFormatToFirstMatch = (markdown, selectedText, format) => {
  if (typeof markdown !== 'string' || typeof selectedText !== 'string' || !selectedText) return null;

  const targetText = findInSource(selectedText, markdown);
  if (!targetText) return null;

  const syntax = buildSyntax(targetText, format);
  if (syntax === null) return null;

  return markdown.replace(targetText, syntax);
};

export const toggleHighlightAtSelection = (markdown, selection) => {
  if (!isValidSelection(markdown, selection)) return null;

  const selectedText = markdown.substring(selection.start, selection.end);
  const before = markdown.substring(selection.start - 4, selection.start);
  const after = markdown.substring(selection.end, selection.end + 4);

  if (before === '====' && after === '====') {
    return markdown.substring(0, selection.start - 4)
      + selectedText
      + markdown.substring(selection.end + 4);
  }

  return markdown.substring(0, selection.start)
    + `====${selectedText}====`
    + markdown.substring(selection.end);
};

export const removeFormat = (markdown, type, text) => {
  if (
    typeof markdown !== 'string'
    || !['highlight', 'color'].includes(type)
    || typeof text !== 'string'
    || !text
  ) {
    return null;
  }

  const escapedText = escapeRegExp(text);

  if (type === 'color') {
    const colorPattern = new RegExp(
      `\\{color:[^\\s}]+\\s+((?:(?!\\})[\\s\\S])*?${escapedText}(?:(?!\\})[\\s\\S])*?)\\}`,
      'g',
    );
    return colorPattern.test(markdown)
      ? markdown.replace(colorPattern, '$1')
      : null;
  }

  const highlightPattern = new RegExp(
    `====((?:(?!====)[\\s\\S])*?${escapedText}(?:(?!====)[\\s\\S])*?)====`,
    'g',
  );
  if (highlightPattern.test(markdown)) {
    return markdown.replace(highlightPattern, '$1');
  }

  const backgroundPattern = new RegExp(
    `\\{bg:[^\\s}]+\\s+((?:(?!\\})[\\s\\S])*?${escapedText}(?:(?!\\})[\\s\\S])*?)\\}`,
    'g',
  );
  if (backgroundPattern.test(markdown)) {
    return markdown.replace(backgroundPattern, '$1');
  }

  const simplePattern = `====${text}====`;
  return markdown.includes(simplePattern)
    ? markdown.replace(simplePattern, text)
    : null;
};

export const changeColor = (markdown, text, newColor) => {
  if (
    typeof markdown !== 'string'
    || typeof text !== 'string'
    || !text
    || typeof newColor !== 'string'
  ) {
    return null;
  }

  const escapedText = escapeRegExp(text);
  const colorPattern = new RegExp(
    `(\\{color:)[^\\s}]+(\\s+(?:(?!\\})[\\s\\S])*?${escapedText}(?:(?!\\})[\\s\\S])*?\\})`,
    'g',
  );

  if (!colorPattern.test(markdown)) return null;
  return markdown.replace(colorPattern, `$1${newColor}$2`);
};

export const insertFormattingSyntax = (markdown, selection, formatKind) => {
  const start = selection?.start ?? 0;
  const end = selection?.end ?? 0;
  const selectedText = (typeof markdown === 'string' && start <= end)
    ? markdown.substring(start, end)
    : '';

  let prefix = '';
  let suffix = '';
  let fallback = 'text';

  switch (formatKind) {
    case 'bold':
      prefix = '**';
      suffix = '**';
      fallback = 'bold text';
      break;
    case 'italic':
      prefix = '*';
      suffix = '*';
      fallback = 'italic text';
      break;
    case 'strikethrough':
      prefix = '~~';
      suffix = '~~';
      fallback = 'strikethrough';
      break;
    case 'code':
      prefix = '`';
      suffix = '`';
      fallback = 'code';
      break;
    case 'codeblock':
      prefix = '\n```js\n';
      suffix = '\n```\n';
      fallback = '// code block';
      break;
    case 'heading':
      prefix = '\n## ';
      suffix = '\n';
      fallback = 'Heading';
      break;
    case 'link':
      prefix = '[';
      suffix = '](https://example.com)';
      fallback = 'link text';
      break;
    case 'quote':
      prefix = '\n> ';
      suffix = '\n';
      fallback = 'Quote text';
      break;
    case 'tasklist':
      prefix = '\n- [ ] ';
      suffix = '\n';
      fallback = 'New task';
      break;
    case 'table':
      prefix = '\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n';
      suffix = '';
      fallback = '';
      break;
    default:
      return markdown;
  }

  const content = selectedText || fallback;
  const inserted = `${prefix}${content}${suffix}`;

  if (!isValidSelection(markdown, selection)) {
    return markdown + inserted;
  }

  return markdown.substring(0, start) + inserted + markdown.substring(end);
};
