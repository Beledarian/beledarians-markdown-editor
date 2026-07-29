import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CustomImage from './CustomImage';

describe('CustomImage Protocol Sanitization', () => {
  it('renders safe image URL schemes', () => {
    render(<CustomImage src="https://example.com/image.png" alt="safe image" assets={[]} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/image.png');
  });

  it('sanitizes and blocks javascript: URI schemes', () => {
    render(<CustomImage src="javascript:alert(1)" alt="malicious image" assets={[]} />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('sanitizes and blocks whitespace-bypassed javascript: URI schemes', () => {
    render(<CustomImage src="java\nscript:alert(1)" alt="bypassed image" assets={[]} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
