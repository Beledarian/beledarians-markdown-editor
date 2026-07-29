import { describe, it, expect } from 'vitest';
import { isIgnored } from './fileSystem';

describe('fileSystem', () => {
    describe('isIgnored', () => {
        it('should return true if name matches a pattern', () => {
            expect(isIgnored('node_modules', ['node_modules'])).toBe(true);
            expect(isIgnored('dist', ['dist'])).toBe(true);
        });

        it('should return false if name does not match any pattern', () => {
            expect(isIgnored('src', ['node_modules'])).toBe(false);
            expect(isIgnored('README.md', ['dist'])).toBe(false);
        });

        it('should handle empty patterns', () => {
            expect(isIgnored('anything', [])).toBe(false);
        });
    });
});
