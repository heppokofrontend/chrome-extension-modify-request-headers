import { describe, it, expect } from 'vitest';

import { isAscii, isValidRegexp } from '@/validators';

describe('isAscii', () => {
  it('accepts an ASCII-only string', () => {
    expect(isAscii('https://api.example.com')).toBe(true);
  });

  it('rejects a string containing non-ASCII characters', () => {
    expect(isAscii('https://例え.com')).toBe(false);
  });
});

describe('isValidRegexp', () => {
  it('returns true for a compilable pattern', () => {
    expect(isValidRegexp('^https://.*\\.example\\.com/')).toBe(true);
  });

  it('returns false for an empty or unparsable pattern', () => {
    expect(isValidRegexp('')).toBe(false);
    expect(isValidRegexp('   ')).toBe(false);
    expect(isValidRegexp('[unterminated')).toBe(false);
  });

  it('returns false for a non-ASCII pattern', () => {
    expect(isValidRegexp('例え')).toBe(false);
  });
});
