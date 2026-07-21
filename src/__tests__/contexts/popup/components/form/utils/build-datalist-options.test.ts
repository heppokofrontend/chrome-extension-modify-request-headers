import { describe, it, expect } from 'vitest';

import { buildDatalistOptions } from '@/contexts/popup/components/form/renderers';

describe('buildDatalistOptions', () => {
  it('builds one <option> per value', () => {
    const options = buildDatalistOptions(['https://a.example.com', 'https://b.example.com']);

    expect(options).toHaveLength(2);
    expect(options.every((option) => option instanceof HTMLOptionElement)).toBe(true);
    expect(options.map((option) => option.value)).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });

  it('drops duplicate values, keeping the first occurrence order', () => {
    const options = buildDatalistOptions(['https://a.example.com', 'https://a.example.com']);

    expect(options.map((option) => option.value)).toEqual(['https://a.example.com']);
  });

  it('drops empty-string values', () => {
    const options = buildDatalistOptions(['', 'https://a.example.com', '']);

    expect(options.map((option) => option.value)).toEqual(['https://a.example.com']);
  });

  it('returns an empty array for an empty input', () => {
    expect(buildDatalistOptions([])).toEqual([]);
  });
});
