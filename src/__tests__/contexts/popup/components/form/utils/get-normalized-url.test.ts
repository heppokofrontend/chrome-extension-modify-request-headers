import { describe, it, expect } from 'vitest';

import { getNormalizedUrl } from '@/contexts/popup/components/form/utils/get-normalized-url';

describe('getNormalizedUrl', () => {
  describe('asHref', () => {
    it('adds the trailing slash a browser would add for a bare origin', () => {
      expect(getNormalizedUrl.asHref('https://heppokofrontend.dev')).toBe(
        'https://heppokofrontend.dev/',
      );
    });

    it('leaves an already-canonical URL unchanged', () => {
      expect(getNormalizedUrl.asHref('https://example.com/path')).toBe('https://example.com/path');
      expect(getNormalizedUrl.asHref('https://example.com/')).toBe('https://example.com/');
    });

    it('trims surrounding whitespace', () => {
      expect(getNormalizedUrl.asHref('  https://heppokofrontend.dev  ')).toBe(
        'https://heppokofrontend.dev/',
      );
    });

    it('returns undefined for empty or unparsable input', () => {
      expect(getNormalizedUrl.asHref('')).toBeUndefined();
      expect(getNormalizedUrl.asHref('   ')).toBeUndefined();
      expect(getNormalizedUrl.asHref('not a url at all!!')).toBeUndefined();
    });
  });

  describe('asOrigin', () => {
    it('returns the origin as-is when a scheme is already given', () => {
      expect(getNormalizedUrl.asOrigin('https://heppokofrontend.dev')).toBe(
        'https://heppokofrontend.dev',
      );
      expect(getNormalizedUrl.asOrigin('https://heppokofrontend.dev/')).toBe(
        'https://heppokofrontend.dev',
      );
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
