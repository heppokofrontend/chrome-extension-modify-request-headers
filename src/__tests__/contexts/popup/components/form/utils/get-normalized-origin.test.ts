import { describe, it, expect } from 'vitest';

import { getNormalizedOrigin } from '@/contexts/popup/components/form/utils/get-normalized-origin';

describe('getNormalizedOrigin', () => {
  it('returns the origin as-is when a scheme is already given', () => {
    expect(getNormalizedOrigin('https://heppokofrontend.dev')).toBe('https://heppokofrontend.dev');
    expect(getNormalizedOrigin('https://heppokofrontend.dev/')).toBe('https://heppokofrontend.dev');
  });

  it('keeps a non-ASCII origin input human-readable instead of returning the punycode-normalized form', () => {
    expect(getNormalizedOrigin('https://例え.com')).toBe('https://例え.com');
    expect(getNormalizedOrigin('例え.com')).toBe('https://例え.com');
  });

  it('rejects input that is not a pure origin (path/query/hash/credentials)', () => {
    expect(getNormalizedOrigin('https://heppokofrontend.dev/path?query=1')).toBeNull();
    expect(getNormalizedOrigin('https://heppokofrontend.dev/path')).toBeNull();
    expect(getNormalizedOrigin('https://heppokofrontend.dev#hash')).toBeNull();
    expect(getNormalizedOrigin('https://user:pass@heppokofrontend.dev')).toBeNull();
  });

  it('prepends https:// when the scheme is omitted', () => {
    expect(getNormalizedOrigin('heppokofrontend.dev')).toBe('https://heppokofrontend.dev');
  });

  it('trims surrounding whitespace', () => {
    expect(getNormalizedOrigin('  heppokofrontend.dev  ')).toBe('https://heppokofrontend.dev');
  });

  it('returns null for empty or unparsable input', () => {
    expect(getNormalizedOrigin('')).toBeNull();
    expect(getNormalizedOrigin('   ')).toBeNull();
    expect(getNormalizedOrigin('not a url at all!!')).toBeNull();
  });
});
