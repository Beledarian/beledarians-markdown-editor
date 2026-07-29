import { describe, it, expect } from 'vitest';
import { processCustomSyntax, sanitizeSchema } from './markdownProcessing';

describe('markdownProcessing', () => {
    describe('processCustomSyntax', () => {
        it('should highlight text with ====', () => {
            const input = '====highlighted====';
            const expected = '<mark class="highlight">highlighted</mark>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should color text with {color:name ...}', () => {
            const input = '{color:red red text}';
            const expected = '<span style="color:red">red text</span>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should color text with {color:hex ...}', () => {
            const input = '{color:#ff0000 hex text}';
            const expected = '<span style="color:#ff0000">hex text</span>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should set background color with {bg:name ...} and compute readable text contrast', () => {
            const input = '{bg:yellow yellow bg}';
            const expected = '<mark style="background-color:yellow; color:#000000">yellow bg</mark>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should render {bg:yellow 🎓 EXAM PATTERN} with readable contrast and emojis', () => {
            const input = '{bg:yellow 🎓 EXAM PATTERN}';
            const expected = '<mark style="background-color:yellow; color:#000000">🎓 EXAM PATTERN</mark>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should extract heading syntax inside {bg:yellow # 🎓 EXAM PATTERN}', () => {
            const input = '{bg:yellow # 🎓 EXAM PATTERN}';
            const expected = '# <mark style="background-color:yellow; color:#000000">🎓 EXAM PATTERN</mark>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should handle multi-line highlights across newlines', () => {
            const input = '{bg:yellow 🎓 EXAM PATTERN\nSecond line of pattern}';
            const expected = '<mark style="background-color:yellow; color:#000000">🎓 EXAM PATTERN\nSecond line of pattern</mark>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should compute white text contrast for dark backgrounds', () => {
            const input = '{bg:#111111 dark bg}';
            const expected = '<mark style="background-color:#111111; color:#ffffff">dark bg</mark>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should compute white text contrast for dark named colors like navy', () => {
            const input = '{bg:navy dark named color}';
            const expected = '<mark style="background-color:navy; color:#ffffff">dark named color</mark>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should process nested custom tags iteratively', () => {
            const input = '{bg:yellow {color:red red on yellow}}';
            const expected = '<mark style="background-color:yellow; color:#000000"><span style="color:red">red on yellow</span></mark>';
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should process custom syntax wrapped inside single quotes or quotes within text', () => {
            const input = "'{bg:yellow 🎓 EXAM PATTERN}'";
            const expected = "'<mark style=\"background-color:yellow; color:#000000\">🎓 EXAM PATTERN</mark>'";
            expect(processCustomSyntax(input)).toBe(expected);
        });

        it('should handle mixed content', () => {
            const input = 'Normal ====High==== {color:blue Blue}';
            const expected = 'Normal <mark class="highlight">High</mark> <span style="color:blue">Blue</span>';
            expect(processCustomSyntax(input)).toBe(expected);
        });
    });

    describe('sanitizeSchema', () => {
        it('should allow mark elements with style and class attributes', () => {
            const markTag = sanitizeSchema.tagNames.includes('mark');
            expect(markTag).toBe(true);
            expect(sanitizeSchema.attributes.mark).toContain('style');
            expect(sanitizeSchema.attributes.mark).toContain('class');
        });

        it('should allow span elements with style attribute', () => {
            const spanTag = sanitizeSchema.tagNames.includes('span');
            expect(spanTag).toBe(true);
            expect(sanitizeSchema.attributes.span).toContain('style');
        });

        it('should allow style attributes', () => {
            expect(sanitizeSchema.attributes['*']).toContain('style');
        });
    });
});
