import { describe, it, expect } from 'vitest';

import { getNormalizedUrl } from '@/contexts/popup/components/form/utils/get-normalized-url';

describe('getNormalizedUrl', () => {
  it('returns the url as-is when a scheme is already given', () => {
    expect(getNormalizedUrl('https://heppokofrontend.dev')).toBe('https://heppokofrontend.dev');
    expect(getNormalizedUrl('https://heppokofrontend.dev/api')).toBe(
      'https://heppokofrontend.dev/api',
    );
  });

  it('keeps a non-ASCII url input human-readable instead of returning the punycode-normalized form', () => {
    expect(getNormalizedUrl('https://例え.com')).toBe('https://例え.com');
    expect(getNormalizedUrl('例え.com')).toBe('https://例え.com');
  });

  it('keeps a path/query when the scheme is omitted', () => {
    expect(getNormalizedUrl('heppokofrontend.dev/api?query=1')).toBe(
      'https://heppokofrontend.dev/api?query=1',
    );
  });

  it('prepends https:// when the scheme is omitted', () => {
    expect(getNormalizedUrl('heppokofrontend.dev')).toBe('https://heppokofrontend.dev');
  });

  it('trims surrounding whitespace', () => {
    expect(getNormalizedUrl('  heppokofrontend.dev  ')).toBe('https://heppokofrontend.dev');
  });

  it('returns null for empty or unparsable input', () => {
    expect(getNormalizedUrl('')).toBeNull();
    expect(getNormalizedUrl('   ')).toBeNull();
    expect(getNormalizedUrl('not a url at all!!')).toBeNull();
  });
});
