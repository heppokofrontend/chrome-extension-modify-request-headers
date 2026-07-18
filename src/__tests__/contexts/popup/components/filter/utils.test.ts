import { describe, it, expect } from 'vitest';

import { escapeAttrValue } from '@/contexts/popup/components/filter/utils/escape-attr-value';
import { isFilterStatus } from '@/contexts/popup/components/filter/utils/type-guard';

describe('escapeAttrValue', () => {
  it('escapes backslashes and double quotes for embedding in a CSS attribute selector', () => {
    expect(escapeAttrValue('back\\slash')).toBe('back\\\\slash');
    expect(escapeAttrValue('has "quotes"')).toBe('has \\"quotes\\"');
    expect(escapeAttrValue('\\"')).toBe('\\\\\\"');
  });

  it('returns plain strings unchanged', () => {
    expect(escapeAttrValue('https://example.com')).toBe('https://example.com');
  });
});

describe('isFilterStatus', () => {
  it('accepts all known filter statuses', () => {
    expect(isFilterStatus('all')).toBe(true);
    expect(isFilterStatus('active')).toBe(true);
    expect(isFilterStatus('inactive')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isFilterStatus('bogus')).toBe(false);
    expect(isFilterStatus('')).toBe(false);
  });
});
