import { describe, it, expect } from 'vitest';

import { getNormalizedUrl } from '@/contexts/popup/components/form/utils/get-normalized-url';

describe('getNormalizedUrl', () => {
  it('returns the url as-is when a scheme is already given and a path is present', () => {
    expect(getNormalizedUrl('https://heppokofrontend.dev/api')).toBe(
      'https://heppokofrontend.dev/api',
    );
  });

  it('appends a trailing slash when the input is a bare origin (no path/query/hash)', () => {
    expect(getNormalizedUrl('https://heppokofrontend.dev')).toBe('https://heppokofrontend.dev/');
  });

  it('leaves a bare origin that already has a trailing slash unchanged', () => {
    expect(getNormalizedUrl('https://heppokofrontend.dev/')).toBe('https://heppokofrontend.dev/');
  });

  it('does not append a trailing slash when the origin is followed by an empty query or hash', () => {
    expect(getNormalizedUrl('https://heppokofrontend.dev/?')).toBe('https://heppokofrontend.dev/?');
    expect(getNormalizedUrl('https://heppokofrontend.dev/#')).toBe('https://heppokofrontend.dev/#');
  });

  it('keeps a non-ASCII url input human-readable instead of returning the punycode-normalized form', () => {
    expect(getNormalizedUrl('https://例え.com')).toBe('https://例え.com/');
    expect(getNormalizedUrl('例え.com')).toBe('https://例え.com/');
  });

  it('keeps a path/query when the scheme is omitted', () => {
    expect(getNormalizedUrl('heppokofrontend.dev/api?query=1')).toBe(
      'https://heppokofrontend.dev/api?query=1',
    );
  });

  it('prepends https:// and appends a trailing slash when the scheme is omitted from a bare origin', () => {
    expect(getNormalizedUrl('heppokofrontend.dev')).toBe('https://heppokofrontend.dev/');
  });

  it('trims surrounding whitespace', () => {
    expect(getNormalizedUrl('  heppokofrontend.dev  ')).toBe('https://heppokofrontend.dev/');
  });

  it('appends a trailing slash to a bare origin that includes a port', () => {
    expect(getNormalizedUrl('http://localhost:3000')).toBe('http://localhost:3000/');
  });

  it('returns null for empty or unparsable input', () => {
    expect(getNormalizedUrl('')).toBeNull();
    expect(getNormalizedUrl('   ')).toBeNull();
    expect(getNormalizedUrl('not a url at all!!')).toBeNull();
  });
});
