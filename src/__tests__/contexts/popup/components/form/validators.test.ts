import { describe, it, expect } from 'vitest';

import { isValidHeaderName, isValidUrl } from '@/contexts/popup/components/form/validators';

describe('isValidHeaderName', () => {
  it('accepts a token consisting of ASCII letters/digits', () => {
    expect(isValidHeaderName('Authorization')).toBe(true);
    expect(isValidHeaderName('X-Custom-Header')).toBe(true);
  });

  it('rejects a name containing non-ASCII characters', () => {
    expect(isValidHeaderName('X-ヘッダー')).toBe(false);
  });

  it('rejects a name containing delimiters like space, colon, or CRLF', () => {
    expect(isValidHeaderName('Bad Header')).toBe(false);
    expect(isValidHeaderName('Bad:Header')).toBe(false);
    expect(isValidHeaderName('Bad\r\nHeader')).toBe(false);
  });

  it('rejects empty or whitespace-only input', () => {
    expect(isValidHeaderName('')).toBe(false);
    expect(isValidHeaderName('   ')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('accepts a parseable absolute URL', () => {
    expect(isValidUrl('https://api.example.com/v1/users')).toBe(true);
  });

  it('accepts http/ws/wss schemes', () => {
    expect(isValidUrl('http://api.example.com/v1/users')).toBe(true);
    expect(isValidUrl('ws://api.example.com/socket')).toBe(true);
    expect(isValidUrl('wss://api.example.com/socket')).toBe(true);
  });

  it('rejects a scheme declarativeNetRequest cannot intervene on', () => {
    expect(isValidUrl('ftp://api.example.com/v1/users')).toBe(false);
  });

  it('rejects a string that is not a parseable absolute URL', () => {
    expect(isValidUrl('not-even-a-url')).toBe(false);
  });

  it('rejects empty or whitespace-only input', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('   ')).toBe(false);
  });
});
