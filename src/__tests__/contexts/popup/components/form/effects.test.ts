import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

import type { HeaderRule } from '@/types';
import popupHtml from '@package/popup.html?raw';

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

describe('form/effects', () => {
  let UI: typeof import('@/contexts/popup/constants').UI;
  let STATE: typeof import('@/contexts/popup/state').STATE;
  let resetFields: typeof import('@/contexts/popup/components/form/effects').resetFields;
  let applyEditMode: typeof import('@/contexts/popup/components/form/effects').applyEditMode;
  let setCustomValidities: typeof import('@/contexts/popup/components/form/effects').setCustomValidities;

  beforeAll(async () => {
    document.documentElement.innerHTML = popupHtml;
    vi.stubGlobal('chrome', { i18n: { getMessage: (key: string) => key } });

    ({ UI } = await import('@/contexts/popup/constants'));
    ({ STATE } = await import('@/contexts/popup/state'));
    ({ resetFields, applyEditMode, setCustomValidities } =
      await import('@/contexts/popup/components/form/effects'));
  });

  beforeEach(() => {
    STATE.editingId = '';
    UI.matchTypeSelect.value = 'url';
    UI.urlInput.value = '';
    UI.originInput.value = '';
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

    it('does not validate the url field when matchType is not url', () => {
      UI.matchTypeSelect.value = 'origin';
      UI.urlInput.value = 'not a url';

      setCustomValidities();

      expect(UI.urlInput.validationMessage).toBe('');
    });

    it('flags an origin that cannot be normalized as invalid when matchType is origin', () => {
      UI.matchTypeSelect.value = 'origin';
      UI.originInput.value = 'https://example.com/some/path';

      setCustomValidities();

      expect(UI.originInput.validationMessage).toBe('form_errInvalidOrigin');
    });

    it('accepts a valid origin when matchType is origin', () => {
      UI.matchTypeSelect.value = 'origin';
      UI.originInput.value = 'https://example.com';

      setCustomValidities();

      expect(UI.originInput.validationMessage).toBe('');
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

      applyEditMode.start(rule);

      expect(STATE.editingId).toBe('a');
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
    });

    it('applyEditMode clears editingId and switches back to create mode', () => {
      applyEditMode.start(makeRule({ id: 'a', matchType: 'url', url: 'https://example.com' }));

      applyEditMode.end();

      expect(STATE.editingId).toBe('');
      expect(UI.form.dataset['mode']).toBe('create');
    });
  });

  describe('resetFields', () => {
    it('match() resets matchType to url and clears url/origin/regexp inputs', () => {
      UI.matchTypeSelect.value = 'regexp';
      UI.urlInput.value = 'https://example.com';
      UI.originInput.value = 'https://example.com';
      UI.regexpInput.value = '^foo$';

      resetFields.match();

      expect(UI.matchTypeSelect.value).toBe('url');
      expect(UI.urlInput.value).toBe('');
      expect(UI.originInput.value).toBe('');
      expect(UI.regexpInput.value).toBe('');
      expect(UI.urlInput.required).toBe(true);
      expect(UI.originInput.required).toBe(false);
      expect(UI.regexpInput.required).toBe(false);
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
});
