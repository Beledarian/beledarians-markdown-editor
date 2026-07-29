import { describe, it, expect } from 'vitest';
import { buildFullHtmlDocument } from './htmlExport';

describe('buildFullHtmlDocument', () => {
  it('constructs a valid HTML document string with provided content', () => {
    const html = buildFullHtmlDocument({
      htmlContent: '<h1>Hello World</h1>',
      theme: 'dark',
      cssContent: 'body { color: red; }',
      title: 'Test Document'
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html data-theme="dark">');
    expect(html).toContain('<title>Test Document</title>');
    expect(html).toContain('<h1>Hello World</h1>');
    expect(html).toContain('body { color: red; }');
  });

  it('escapes HTML entity characters in title and theme to prevent script injection', () => {
    const html = buildFullHtmlDocument({
      htmlContent: '<p>Content</p>',
      theme: 'dark" onload="alert(1)',
      title: '</title><script>alert("xss")</script>'
    });

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;/title&gt;&lt;script&gt;');
    expect(html).toContain('dark&quot; onload=&quot;');
  });

  it('handles empty parameters gracefully', () => {
    const html = buildFullHtmlDocument({});
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html data-theme="dark">');
    expect(html).toContain('<div class="preview"></div>');
  });
});
