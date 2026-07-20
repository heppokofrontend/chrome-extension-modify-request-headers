import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule, SaveData } from '@/types';
import popupHtml from '@package/popup.html?raw';

const formState: SaveData['formState'] = {
  matchType: 'url',
  operation: 'set',
};
const makeRule = (
  overrides: Partial<HeaderRule> & Pick<HeaderRule, 'id' | 'matchType'>,
): HeaderRule => ({
  url: '',
  regexp: '',
  headerName: 'X-Test',
  operation: 'set',
  value: '',
  isActive: true,
  ...overrides,
});

describe('filter/effects', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let applyFilter: typeof import('@/contexts/popup/components/filter/effects').applyFilter;
  let refreshFilterResultDefault: typeof import('@/contexts/popup/components/filter/effects').refreshFilterResultDefault;
  let FILTER_STATE: typeof import('@/contexts/popup/components/filter/constants').FILTER_STATE;

  const getMessageMock = vi.fn(
    (key: string, substitutions?: string | string[]) =>
      `${key}:${Array.isArray(substitutions) ? substitutions.join(',') : (substitutions ?? '')}`,
  );

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: getMessageMock } });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ applyFilter, refreshFilterResultDefault } =
      await import('@/contexts/popup/components/filter/effects'));
    ({ FILTER_STATE } = await import('@/contexts/popup/components/filter/constants'));
  });

  beforeEach(() => {
    getMessageMock.mockClear();
    FILTER_STATE.textValue = '';
    FILTER_STATE.statusValue = 'all';
    FILTER_STATE.defaultResultText = '';
    Object.assign(STATE, { rules: [], formState });

    UI.rules.innerHTML = `
      <section data-rule="X-Foo" data-group-status="active">
        <table><tbody>
          <tr data-active="true"><td>foo-active</td></tr>
          <tr data-active="false"><td>foo-inactive</td></tr>
        </tbody></table>
      </section>
      <section data-rule="X-Bar" data-group-status="inactive">
        <table><tbody>
          <tr data-active="false"><td>bar-inactive</td></tr>
        </tbody></table>
      </section>
    `;
  });

  describe('applyFilter', () => {
    it('shows the default text and skips getMessage when no filter is active', () => {
      FILTER_STATE.defaultResultText = '3 rules';

      applyFilter();

      expect(UI.filterResult.textContent).toBe('3 rules');
      expect(getMessageMock).not.toHaveBeenCalled();
    });

    it('counts rows matching only the text filter, across statuses', () => {
      FILTER_STATE.textValue = 'X-Foo';

      applyFilter();

      expect(getMessageMock).toHaveBeenCalledWith('filter_resultCount', [2]);
    });

    it('counts rows matching only the status filter', () => {
      FILTER_STATE.statusValue = 'active';

      applyFilter();

      expect(getMessageMock).toHaveBeenCalledWith('filter_resultCount', [1]);
    });

    it('counts rows matching both the text and status filters', () => {
      FILTER_STATE.textValue = 'X-Bar';
      FILTER_STATE.statusValue = 'inactive';

      applyFilter();

      expect(getMessageMock).toHaveBeenCalledWith('filter_resultCount', [1]);
    });

    it('injects a style rule that hides rows/sections not matching the text filter', () => {
      FILTER_STATE.textValue = 'X-Foo';

      applyFilter();

      const styleText = document.head.querySelector('style')?.textContent ?? '';

      expect(styleText).toContain('[data-rule*="X-Foo"]');
    });

    it('injects style rules that collapse rows and hide sections by status', () => {
      FILTER_STATE.statusValue = 'active';

      applyFilter();

      const styleText = document.head.querySelector('style')?.textContent ?? '';

      expect(styleText).toContain(
        'tr[data-active]:not([data-active="true"]) { visibility: collapse; }',
      );
      expect(styleText).toContain('section[data-group-status="inactive"] { display: none; }');
    });

    it('escapes `"` and `\\` in the text filter before embedding it in the attribute selector', () => {
      FILTER_STATE.textValue = 'a"b\\c';

      applyFilter();

      const styleText = document.head.querySelector('style')?.textContent ?? '';

      expect(styleText).toContain('[data-rule*="a\\"b\\\\c"]');
    });
  });

  describe('refreshFilterResultDefault', () => {
    it('computes the default text from STATE.rules and displays it immediately when no filter is active', () => {
      Object.assign(STATE, {
        rules: [
          makeRule({ id: 'a', matchType: 'prefix', url: 'https://a.example.com' }),
          makeRule({
            id: 'b',
            matchType: 'prefix',
            url: 'https://a.example.com',
            isActive: false,
          }),
          makeRule({ id: 'c', matchType: 'prefix', url: 'https://b.example.com' }),
        ],
      });

      refreshFilterResultDefault();

      // 3ルール中2グループ（a.example.com, b.example.com）、有効2件/全3件。
      expect(UI.filterResult.textContent).toBe('status_patternsAndRules:2,3,2');
    });

    it('does not override the currently displayed filtered count when a filter is active', () => {
      FILTER_STATE.textValue = 'X-Foo';
      applyFilter();
      const beforeText = UI.filterResult.textContent;

      refreshFilterResultDefault();

      expect(UI.filterResult.textContent).toBe(beforeText);
    });
  });
});
