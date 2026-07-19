import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule, SaveDataType } from '@/types';
import popupHtml from '@package/popup.html?raw';

const formState: SaveDataType['formState'] = {
  matchType: 'url',
  operation: 'set',
};

describe('rules/renderers/render-rules', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let BTN_EDIT_CLASS: typeof import('@/contexts/popup/constants').BTN_EDIT_CLASS;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let getPatternGroupKey: typeof import('@/contexts/popup/components/rules/renderers/render-rules').getPatternGroupKey;
  let renderRules: typeof import('@/contexts/popup/components/rules/renderers/render-rules').renderRules;

  const getMessageMock = vi.fn(
    (key: string, substitutions?: string | string[]) =>
      `${key}:${Array.isArray(substitutions) ? substitutions.join(',') : (substitutions ?? '')}`,
  );

  const makeRule = (
    overrides: Partial<HeaderRule> & Pick<HeaderRule, 'id' | 'matchType'>,
  ): HeaderRule => ({
    url: '',
    origin: '',
    regexp: '',
    headerName: 'X-Test',
    operation: 'set',
    value: '',
    isActive: true,
    ...overrides,
  });

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: getMessageMock } });

    ({ UI, BTN_EDIT_CLASS } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ getPatternGroupKey, renderRules } =
      await import('@/contexts/popup/components/rules/renderers/render-rules'));
  });

  beforeEach(() => {
    getMessageMock.mockClear();
  });

  describe('getPatternGroupKey', () => {
    it('combines matchType and the matching value (origin)', () => {
      const rule = makeRule({ id: 'a', matchType: 'origin', origin: 'https://example.com' });

      expect(getPatternGroupKey(rule)).toBe('https://example.com::origin');
    });

    it('combines matchType and the matching value (regexp)', () => {
      const rule = makeRule({
        id: 'a',
        matchType: 'regexp',
        regexp: '^https://.*\\.example\\.com/',
      });

      expect(getPatternGroupKey(rule)).toBe('^https://.*\\.example\\.com/::regexp');
    });

    it('treats rules with the same matchType but different values as distinct groups', () => {
      const a = makeRule({ id: 'a', matchType: 'origin', origin: 'https://a.example.com' });
      const b = makeRule({ id: 'b', matchType: 'origin', origin: 'https://b.example.com' });

      expect(getPatternGroupKey(a)).not.toBe(getPatternGroupKey(b));
    });

    it('treats a punycode-form and a unicode-form origin for the same host as the same group', () => {
      const punycode = makeRule({
        id: 'a',
        matchType: 'origin',
        origin: 'https://xn--r8jz45g.com',
      });
      const unicode = makeRule({ id: 'b', matchType: 'origin', origin: 'https://例え.com' });

      expect(getPatternGroupKey(punycode)).toBe(getPatternGroupKey(unicode));
    });

    it('treats a punycode-form and a unicode-form url for the same host as the same group', () => {
      const punycode = makeRule({
        id: 'a',
        matchType: 'url',
        url: 'https://xn--r8jz45g.com/path',
      });
      const unicode = makeRule({ id: 'b', matchType: 'url', url: 'https://例え.com/path' });

      expect(getPatternGroupKey(punycode)).toBe(getPatternGroupKey(unicode));
    });
  });

  describe('renderRules', () => {
    it('renders one section per distinct matchType+value group, containing all its rules as rows', () => {
      STATE.saveData = {
        rules: [
          makeRule({
            id: 'a',
            matchType: 'origin',
            origin: 'https://example.com',
            headerName: 'X-A',
          }),
          makeRule({
            id: 'b',
            matchType: 'origin',
            origin: 'https://example.com',
            headerName: 'X-B',
          }),
          makeRule({
            id: 'c',
            matchType: 'origin',
            origin: 'https://other.example.com',
            headerName: 'X-C',
          }),
        ],
        formState,
      };

      renderRules();

      const sections = UI.rules.querySelectorAll('section.rule');

      expect(sections).toHaveLength(2);

      const exampleSection = [...sections].find(
        (section) => section.getAttribute('data-rule') === 'https://example.com',
      );

      expect(exampleSection?.querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('replaces the previous render entirely rather than appending to it', () => {
      STATE.saveData = {
        rules: [makeRule({ id: 'a', matchType: 'origin', origin: 'https://example.com' })],
        formState,
      };
      renderRules();

      STATE.saveData = {
        rules: [makeRule({ id: 'b', matchType: 'origin', origin: 'https://other.example.com' })],
        formState,
      };
      renderRules();

      expect(UI.rules.querySelectorAll('section.rule')).toHaveLength(1);
    });

    it('sets data-group-status to "active" when every rule in the group is active', () => {
      STATE.saveData = {
        rules: [
          makeRule({ id: 'a', matchType: 'origin', origin: 'https://example.com', isActive: true }),
          makeRule({ id: 'b', matchType: 'origin', origin: 'https://example.com', isActive: true }),
        ],
        formState,
      };

      renderRules();

      expect(UI.rules.querySelector('section.rule')?.getAttribute('data-group-status')).toBe(
        'active',
      );
    });

    it('sets data-group-status to "inactive" when every rule in the group is inactive', () => {
      STATE.saveData = {
        rules: [
          makeRule({
            id: 'a',
            matchType: 'origin',
            origin: 'https://example.com',
            isActive: false,
          }),
        ],
        formState,
      };

      renderRules();

      expect(UI.rules.querySelector('section.rule')?.getAttribute('data-group-status')).toBe(
        'inactive',
      );
    });

    it('sets data-group-status to "mixed" when the group has both active and inactive rules', () => {
      STATE.saveData = {
        rules: [
          makeRule({ id: 'a', matchType: 'origin', origin: 'https://example.com', isActive: true }),
          makeRule({
            id: 'b',
            matchType: 'origin',
            origin: 'https://example.com',
            isActive: false,
          }),
        ],
        formState,
      };

      renderRules();

      expect(UI.rules.querySelector('section.rule')?.getAttribute('data-group-status')).toBe(
        'mixed',
      );
    });

    it('sets data-active on each row to match the rule isActive state', () => {
      STATE.saveData = {
        rules: [
          makeRule({ id: 'a', matchType: 'origin', origin: 'https://example.com', isActive: true }),
          makeRule({
            id: 'b',
            matchType: 'origin',
            origin: 'https://example.com',
            isActive: false,
          }),
        ],
        formState,
      };

      renderRules();

      const rows = [...UI.rules.querySelectorAll('tbody tr')];

      expect(rows.map((row) => row.getAttribute('data-active'))).toStrictEqual(['true', 'false']);
    });

    it('shows "-" instead of the value for a remove-operation rule', () => {
      STATE.saveData = {
        rules: [
          makeRule({
            id: 'a',
            matchType: 'origin',
            origin: 'https://example.com',
            operation: 'remove',
            value: 'ignored',
          }),
        ],
        formState,
      };

      renderRules();

      const valueCell = UI.rules.querySelectorAll('tbody td')[1];

      expect(valueCell?.textContent).toBe('-');
      expect(valueCell?.className).toBe('of-remove');
    });

    it('enters edit mode for the clicked rule when its edit button is clicked', () => {
      STATE.saveData = {
        rules: [makeRule({ id: 'a', matchType: 'origin', origin: 'https://example.com' })],
        formState,
      };
      STATE.editingId = '';

      renderRules();

      UI.rules.querySelector<HTMLButtonElement>(`button.${BTN_EDIT_CLASS}`)?.click();

      expect(STATE.editingId).toBe('a');
      expect(UI.form.dataset['mode']).toBe('edit');
    });

    it('uses /pattern/ as the section label for regexp rules, and the raw value for url/origin rules', () => {
      STATE.saveData = {
        rules: [
          makeRule({ id: 'a', matchType: 'regexp', regexp: '^https://.*\\.example\\.com/' }),
          makeRule({ id: 'b', matchType: 'url', url: 'https://example.com/path' }),
        ],
        formState,
      };

      renderRules();

      const labels = [...UI.rules.querySelectorAll('section.rule')].map((section) =>
        section.getAttribute('data-rule'),
      );

      expect(labels).toStrictEqual(['/^https://.*\\.example\\.com//', 'https://example.com/path']);
    });

    it('merges a legacy punycode-saved origin rule with a unicode-saved origin rule into one section, preferring the unicode label', () => {
      STATE.saveData = {
        rules: [
          makeRule({
            id: 'a',
            matchType: 'origin',
            origin: 'https://xn--r8jz45g.com',
            headerName: 'X-A',
          }),
          makeRule({
            id: 'b',
            matchType: 'origin',
            origin: 'https://例え.com',
            headerName: 'X-B',
          }),
        ],
        formState,
      };

      renderRules();

      const sections = UI.rules.querySelectorAll('section.rule');

      expect(sections).toHaveLength(1);
      expect(sections[0]?.getAttribute('data-rule')).toBe('https://例え.com');
      expect(sections[0]?.querySelectorAll('tbody tr')).toHaveLength(2);
    });
  });
});
