import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule } from '@/types';
import popupHtml from '@package/popup.html?raw';

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

describe('form/effects', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let resetFields: typeof import('@/contexts/popup/components/form/effects').resetFields;
  let applyEditMode: typeof import('@/contexts/popup/components/form/effects').applyEditMode;
  let setCustomValidities: typeof import('@/contexts/popup/components/form/effects').setCustomValidities;
  let renderMatchDatalists: typeof import('@/contexts/popup/components/form/effects').renderMatchDatalists;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ resetFields, applyEditMode, setCustomValidities, renderMatchDatalists } =
      await import('@/contexts/popup/components/form/effects'));
  });

  beforeEach(() => {
    STATE.formState.editingId = '';
    STATE.rules = [];
    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = '';
    UI.regexpInput.value = '';
    UI.headerNameInput.value = '';
    UI.operationSelect.value = 'set';
    UI.valueInput.value = '';
  });

  describe('setCustomValidities', () => {
    it('accepts a non-ASCII url when matchType is url (normalized via isSafeUrl)', () => {
      UI.matchTypeSelect.value = 'url';
      UI.urlInput.value = 'https://例え.com';

      setCustomValidities();

      expect(UI.urlInput.validationMessage).toBe('');
    });

    it('flags an ASCII but unparsable url as invalid when matchType is url', () => {
      UI.matchTypeSelect.value = 'url';
      UI.urlInput.value = 'not a url';

      setCustomValidities();

      expect(UI.urlInput.validationMessage).toBe('form_errInvalidUrl');
    });

    it('accepts a valid url when matchType is url', () => {
      UI.matchTypeSelect.value = 'url';
      UI.urlInput.value = 'https://example.com/path';

      setCustomValidities();

      expect(UI.urlInput.validationMessage).toBe('');
    });

    it('does not validate the url field when matchType is not url/prefix', () => {
      UI.matchTypeSelect.value = 'regexp';
      UI.urlInput.value = 'not a url';

      setCustomValidities();

      expect(UI.urlInput.validationMessage).toBe('');
    });

    it('accepts a valid url when matchType is prefix (shares the url field)', () => {
      UI.matchTypeSelect.value = 'prefix';
      UI.urlInput.value = 'https://example.com/path';

      setCustomValidities();

      expect(UI.urlInput.validationMessage).toBe('');
    });

    it('flags a whitespace-only url as invalid when matchType is url (required alone accepts it)', () => {
      UI.matchTypeSelect.value = 'url';
      UI.urlInput.value = '   ';

      setCustomValidities();

      expect(UI.urlInput.validationMessage).toBe('form_errInvalidUrl');
    });

    it('leaves an empty url unflagged so the native required message applies', () => {
      UI.matchTypeSelect.value = 'url';
      UI.urlInput.value = '';

      setCustomValidities();

      expect(UI.urlInput.validity.customError).toBe(false);
    });

    it('flags an invalid regexp as invalid when matchType is regexp', () => {
      UI.matchTypeSelect.value = 'regexp';
      UI.regexpInput.value = '(';

      setCustomValidities();

      expect(UI.regexpInput.validationMessage).toBe('form_errInvalidRegexp');
    });

    it('accepts a valid regexp when matchType is regexp', () => {
      UI.matchTypeSelect.value = 'regexp';
      UI.regexpInput.value = '^https://.*\\.example\\.com/';

      setCustomValidities();

      expect(UI.regexpInput.validationMessage).toBe('');
    });

    it('flags a whitespace-only regexp as invalid when matchType is regexp (required alone accepts it)', () => {
      UI.matchTypeSelect.value = 'regexp';
      UI.regexpInput.value = '   ';

      setCustomValidities();

      expect(UI.regexpInput.validationMessage).toBe('form_errInvalidRegexp');
    });

    it('flags a header value containing a newline as invalid unless operation is remove', () => {
      UI.operationSelect.value = 'set';
      UI.valueInput.value = 'line1\nline2';

      setCustomValidities();

      expect(UI.valueInput.validationMessage).toBe('form_errInvalidHeaderValue');
    });

    it('does not validate the value field when operation is remove', () => {
      UI.operationSelect.value = 'remove';
      UI.valueInput.value = 'line1\nline2';

      setCustomValidities();

      expect(UI.valueInput.validationMessage).toBe('');
    });

    it('flags an invalid header name as invalid', () => {
      UI.headerNameInput.value = 'invalid header name';

      setCustomValidities();

      expect(UI.headerNameInput.validationMessage).toBe('form_errInvalidHeaderName');
    });

    it('accepts a valid header name', () => {
      UI.headerNameInput.value = 'X-Custom-Header';

      setCustomValidities();

      expect(UI.headerNameInput.validationMessage).toBe('');
    });

    it('flags a whitespace-only header name as invalid (required alone accepts it)', () => {
      UI.headerNameInput.value = '   ';

      setCustomValidities();

      expect(UI.headerNameInput.validationMessage).toBe('form_errInvalidHeaderName');
    });
  });

  describe('applyEditMode.start / applyEditMode', () => {
    it('applyEditMode.start fills the form with the rule and switches to edit mode', () => {
      const rule = makeRule({
        id: 'a',
        matchType: 'regexp',
        regexp: '^https://.*\\.example\\.com/',
        headerName: 'X-Foo',
        operation: 'remove',
        value: 'bar',
        isActive: false,
      });

      // 一覧の中の1件をクリックして編集開始する想定なので、対象ルール自身も STATE.rules に含める。
      STATE.rules = [
        makeRule({ id: 'other', matchType: 'regexp', regexp: '^https://other\\.example\\.com/' }),
        rule,
      ];

      applyEditMode.start(rule);

      expect(STATE.formState.editingId).toBe('a');
      expect(UI.form.dataset['mode']).toBe('edit');
      expect(UI.matchTypeSelect.value).toBe('regexp');
      expect(UI.regexpInput.value).toBe('^https://.*\\.example\\.com/');
      expect(UI.regexpInput.required).toBe(true);
      expect(UI.urlInput.required).toBe(false);
      expect(UI.headerNameInput.value).toBe('X-Foo');
      expect(UI.isActiveSelect.value).toBe('false');
      expect(UI.operationSelect.value).toBe('remove');
      expect(UI.valueInput.value).toBe('bar');
      expect(document.activeElement).toBe(UI.matchTypeSelect);

      // regexp モードなので regexp 側の datalist だけ候補が入り、url 側は空になる。
      expect([...UI.regexpDatalist.options].map((option) => option.value)).toEqual([
        '^https://other\\.example\\.com/',
        '^https://.*\\.example\\.com/',
      ]);
      expect(UI.urlDatalist.options).toHaveLength(0);
    });

    it('applyEditMode clears editingId and switches back to create mode', () => {
      applyEditMode.start(makeRule({ id: 'a', matchType: 'url', url: 'https://example.com' }));

      applyEditMode.end();

      expect(STATE.formState.editingId).toBe('');
      expect(UI.form.dataset['mode']).toBe('create');
    });
  });

  describe('resetFields', () => {
    it('match() resets matchType to url and clears url/regexp inputs', () => {
      STATE.rules = [
        makeRule({ id: 'a', matchType: 'url', url: 'https://example.com' }),
        makeRule({ id: 'b', matchType: 'regexp', regexp: '^foo$' }),
      ];
      UI.matchTypeSelect.value = 'regexp';
      UI.urlInput.value = 'https://example.com';
      UI.regexpInput.value = '^foo$';

      resetFields.match();

      expect(UI.matchTypeSelect.value).toBe('url');
      expect(UI.urlInput.value).toBe('');
      expect(UI.regexpInput.value).toBe('');
      expect(UI.urlInput.required).toBe(true);
      expect(UI.regexpInput.required).toBe(false);

      // デフォルトの matchType は url なので url 側の datalist だけ候補が入る。
      expect([...UI.urlDatalist.options].map((option) => option.value)).toEqual([
        'https://example.com',
      ]);
      expect(UI.regexpDatalist.options).toHaveLength(0);
    });

    it('header() resets headerName/isActive/operation/value to their defaults', () => {
      UI.headerNameInput.value = 'X-Foo';
      UI.isActiveSelect.value = 'false';
      UI.operationSelect.value = 'remove';
      UI.valueInput.value = 'bar';

      resetFields.header();

      expect(UI.headerNameInput.value).toBe('');
      expect(UI.isActiveSelect.value).toBe('true');
      expect(UI.operationSelect.value).toBe('set');
      expect(UI.valueInput.value).toBe('');
    });
  });

  describe('renderMatchDatalists', () => {
    it('fills the url datalist with unique, non-empty url values regardless of each rule matchType', () => {
      STATE.rules = [
        makeRule({ id: 'a', matchType: 'url', url: 'https://a.example.com' }),
        makeRule({ id: 'b', matchType: 'prefix', url: 'https://a.example.com' }),
        makeRule({ id: 'c', matchType: 'prefix', url: 'https://b.example.com/api' }),
        makeRule({ id: 'd', matchType: 'regexp', regexp: '^https://c\\.example\\.com/' }),
        makeRule({ id: 'e', matchType: 'url', url: '' }),
      ];

      renderMatchDatalists('url');

      expect([...UI.urlDatalist.options].map((option) => option.value)).toEqual([
        'https://a.example.com',
        'https://b.example.com/api',
      ]);
      expect(UI.regexpDatalist.options).toHaveLength(0);
    });

    it('shares the url datalist between matchType url and prefix', () => {
      STATE.rules = [makeRule({ id: 'a', matchType: 'prefix', url: 'https://a.example.com/api' })];

      renderMatchDatalists('prefix');

      expect([...UI.urlDatalist.options].map((option) => option.value)).toEqual([
        'https://a.example.com/api',
      ]);
    });

    it('fills the regexp datalist and clears the url datalist when matchType is regexp', () => {
      STATE.rules = [
        makeRule({ id: 'a', matchType: 'regexp', regexp: '^https://a\\.example\\.com/' }),
        makeRule({ id: 'b', matchType: 'url', url: 'https://b.example.com' }),
      ];
      renderMatchDatalists('url');

      renderMatchDatalists('regexp');

      expect([...UI.regexpDatalist.options].map((option) => option.value)).toEqual([
        '^https://a\\.example\\.com/',
      ]);
      expect(UI.urlDatalist.options).toHaveLength(0);
    });
  });
});
