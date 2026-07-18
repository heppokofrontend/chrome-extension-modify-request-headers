import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('i18n (data-i18n / data-i18n-aria-label DOM reflection)', () => {
  const getMessageMock = vi.fn((key: string) => `translated:${key}`);
  const getUILanguageMock = vi.fn(() => 'en');

  beforeEach(() => {
    vi.resetModules();
    getMessageMock.mockClear().mockImplementation((key: string) => `translated:${key}`);
    getUILanguageMock.mockClear().mockReturnValue('en');
    vi.stubGlobal('chrome', {
      i18n: { getMessage: getMessageMock, getUILanguage: getUILanguageMock },
    });
  });

  it('sets textContent on every [data-i18n] element to the resolved message', async () => {
    document.documentElement.innerHTML =
      '<body><button data-i18n="form_buttonSave">loading...</button>' +
      '<span data-i18n="status_sending">loading...</span></body>';

    await import('@/i18n');

    expect(document.querySelector('button')?.textContent).toBe('translated:form_buttonSave');
    expect(document.querySelector('span')?.textContent).toBe('translated:status_sending');
  });

  it('leaves textContent untouched when the resolved message is empty', async () => {
    getMessageMock.mockReturnValue('');
    document.documentElement.innerHTML =
      '<body><button data-i18n="missing_key">fallback</button></body>';

    await import('@/i18n');

    expect(document.querySelector('button')?.textContent).toBe('fallback');
  });

  it('skips elements whose data-i18n attribute is empty', async () => {
    document.documentElement.innerHTML = '<body><button data-i18n="">fallback</button></body>';

    await import('@/i18n');

    expect(getMessageMock).not.toHaveBeenCalled();
    expect(document.querySelector('button')?.textContent).toBe('fallback');
  });

  it('sets aria-label on every [data-i18n-aria-label] element to the resolved message', async () => {
    document.documentElement.innerHTML =
      '<body><button data-i18n-aria-label="form_buttonSave"></button></body>';

    await import('@/i18n');

    expect(document.querySelector('button')?.getAttribute('aria-label')).toBe(
      'translated:form_buttonSave',
    );
  });

  it('does not set aria-label when the resolved message is empty', async () => {
    getMessageMock.mockReturnValue('');
    document.documentElement.innerHTML =
      '<body><button data-i18n-aria-label="missing_key"></button></body>';

    await import('@/i18n');

    expect(document.querySelector('button')?.hasAttribute('aria-label')).toBe(false);
  });

  it.each([
    ['ja', 'ja'],
    ['ja-JP', 'ja'],
    ['fr', 'en'],
  ])('sets documentElement.lang to "%s" -> "%s"', async (uiLanguage, expectedLang) => {
    getUILanguageMock.mockReturnValue(uiLanguage);
    document.documentElement.innerHTML = '<body></body>';

    await import('@/i18n');

    expect(document.documentElement.lang).toBe(expectedLang);
  });
});
