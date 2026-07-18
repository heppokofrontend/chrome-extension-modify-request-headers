import { describe, it, expect } from 'vitest';

import { formatRuleSummary } from '@/contexts/popup/components/form/utils/formatters';

describe('formatRuleSummary', () => {
  it('shows just "remove" without a value for a remove-operation rule', () => {
    expect(formatRuleSummary({ operation: 'remove', value: 'ignored' })).toBe('remove');
  });

  it('shows "operation: value" for a non-remove operation', () => {
    expect(formatRuleSummary({ operation: 'set', value: 'X-Value' })).toBe('set: X-Value');
    expect(formatRuleSummary({ operation: 'append', value: 'X-Value' })).toBe('append: X-Value');
  });
});
