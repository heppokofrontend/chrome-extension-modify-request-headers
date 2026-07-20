import { describe, it, expect } from 'vitest';

import { isAscii, isSafeUrl, isValidRegexp } from '@/validators';

describe('isAscii', () => {
  it('accepts an ASCII-only string', () => {
    expect(isAscii('https://api.example.com')).toBe(true);
  });

  it('rejects a string containing non-ASCII characters', () => {
    expect(isAscii('https://例え.com')).toBe(false);
  });
});

describe('isSafeUrl', () => {
  it('accepts an ASCII-only http/https/ws/wss URL', () => {
    expect(isSafeUrl('https://api.example.com/v1/users')).toBe(true);
    expect(isSafeUrl('http://api.example.com/v1/users')).toBe(true);
    expect(isSafeUrl('ws://api.example.com/socket')).toBe(true);
    expect(isSafeUrl('wss://api.example.com/socket')).toBe(true);
  });

  it('accepts a non-ASCII URL that normalizes to ASCII via punycode/percent-encoding', () => {
    expect(isSafeUrl('https://例え.com')).toBe(true);
    expect(isSafeUrl('https://api.example.com/検索?q=テスト')).toBe(true);
  });

  it('rejects a scheme declarativeNetRequest cannot intervene on', () => {
    expect(isSafeUrl('ftp://api.example.com/v1/users')).toBe(false);
  });

  it('rejects a string that is not a parseable absolute URL', () => {
    expect(isSafeUrl('not-even-a-url')).toBe(false);
  });

  it('rejects empty or whitespace-only input', () => {
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl('   ')).toBe(false);
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
