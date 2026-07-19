import { describe, it, expect } from 'vitest';

import { getNormalizedUrl } from '@/contexts/popup/components/form/utils/get-normalized-url';

describe('getNormalizedUrl', () => {
  describe('asOrigin', () => {
    it('returns the origin as-is when a scheme is already given', () => {
      expect(getNormalizedUrl.asOrigin('https://heppokofrontend.dev')).toBe(
        'https://heppokofrontend.dev',
      );
      expect(getNormalizedUrl.asOrigin('https://heppokofrontend.dev/')).toBe(
        'https://heppokofrontend.dev',
      );
    });

    it('keeps a non-ASCII origin input human-readable instead of returning the punycode-normalized form', () => {
      expect(getNormalizedUrl.asOrigin('https://例え.com')).toBe('https://例え.com');
      expect(getNormalizedUrl.asOrigin('例え.com')).toBe('https://例え.com');
    });

    it('rejects input that is not a pure origin (path/query/hash/credentials)', () => {
      expect(getNormalizedUrl.asOrigin('https://heppokofrontend.dev/path?query=1')).toBeUndefined();
      expect(getNormalizedUrl.asOrigin('https://heppokofrontend.dev/path')).toBeUndefined();
      expect(getNormalizedUrl.asOrigin('https://heppokofrontend.dev#hash')).toBeUndefined();
      expect(getNormalizedUrl.asOrigin('https://user:pass@heppokofrontend.dev')).toBeUndefined();
    });

    it('prepends https:// when the scheme is omitted', () => {
      expect(getNormalizedUrl.asOrigin('heppokofrontend.dev')).toBe('https://heppokofrontend.dev');
    });

    it('trims surrounding whitespace', () => {
      expect(getNormalizedUrl.asOrigin('  heppokofrontend.dev  ')).toBe(
        'https://heppokofrontend.dev',
      );
    });

    it('returns undefined for empty or unparsable input', () => {
      expect(getNormalizedUrl.asOrigin('')).toBeUndefined();
      expect(getNormalizedUrl.asOrigin('   ')).toBeUndefined();
      expect(getNormalizedUrl.asOrigin('not a url at all!!')).toBeUndefined();
    });
  });
});
