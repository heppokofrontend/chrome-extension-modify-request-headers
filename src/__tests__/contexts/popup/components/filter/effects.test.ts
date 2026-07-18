import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import popupHtml from '@package/popup.html?raw';

describe('filter/effects', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let applyFilter: typeof import('@/contexts/popup/components/filter/effects').applyFilter;
  let setFilterResultDefault: typeof import('@/contexts/popup/components/filter/effects').setFilterResultDefault;
  let FILTER_STATE: typeof import('@/contexts/popup/components/filter/constants').FILTER_STATE;

  const getMessageMock = vi.fn(
    (key: string, substitutions?: string | string[]) =>
      `${key}:${Array.isArray(substitutions) ? substitutions.join(',') : (substitutions ?? '')}`,
  );

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: getMessageMock } });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ applyFilter, setFilterResultDefault } =
      await import('@/contexts/popup/components/filter/effects'));
    ({ FILTER_STATE } = await import('@/contexts/popup/components/filter/constants'));
  });

  beforeEach(() => {
    getMessageMock.mockClear();
    FILTER_STATE.textValue = '';
    FILTER_STATE.statusValue = 'all';
    FILTER_STATE.defaultResultText = '';

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
      setFilterResultDefault('3 rules');

      applyFilter();

      expect(UI.filterResult.textContent).toBe('3 rules');
      expect(getMessageMock).not.toHaveBeenCalled();
    });

    it('counts rows matching only the text filter, across statuses', () => {
      FILTER_STATE.textValue = 'X-Foo';

      applyFilter();

      expect(getMessageMock).toHaveBeenCalledWith('filter_resultCount', '2');
    });

    it('counts rows matching only the status filter', () => {
      FILTER_STATE.statusValue = 'active';

      applyFilter();

      expect(getMessageMock).toHaveBeenCalledWith('filter_resultCount', '1');
    });

    it('counts rows matching both the text and status filters', () => {
      FILTER_STATE.textValue = 'X-Bar';
      FILTER_STATE.statusValue = 'inactive';

      applyFilter();

      expect(getMessageMock).toHaveBeenCalledWith('filter_resultCount', '1');
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

  describe('setFilterResultDefault', () => {
    it('updates the displayed text immediately when no filter is active', () => {
      setFilterResultDefault('5 rules');

      expect(UI.filterResult.textContent).toBe('5 rules');
    });

    it('does not override the currently displayed filtered count when a filter is active', () => {
      FILTER_STATE.textValue = 'X-Foo';
      applyFilter();
      const beforeText = UI.filterResult.textContent;

      setFilterResultDefault('unrelated default');

      expect(UI.filterResult.textContent).toBe(beforeText);
    });
  });
});
