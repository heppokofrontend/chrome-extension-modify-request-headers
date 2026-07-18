import { describe, it, expect } from 'vitest';

import enMessages from '@package/_locales/en/messages.json';
import jaMessages from '@package/_locales/ja/messages.json';
// HTML scanned for data-i18n keys. Add new package/ HTML files here too.
import popupHtml from '@package/popup.html?raw';

type Messages = Record<string, { message: string }>;

const localeEntries: [locale: string, messages: Messages][] = [
  ['en', enMessages],
  ['ja', jaMessages],
];
const htmlSources = [popupHtml];

describe('_locales/*/messages.json', () => {
  it('every locale has the same set of keys', () => {
    // Key-set equality is also checked at the type level: missing/extra keys are caught by
    // tsc, not just by the runtime assertion below. (Possible because JSON imports get
    // literal key types. Value contents can't be checked by types, so that's covered by the
    // test below.)
    const enCoversJa: Record<keyof typeof jaMessages, { message: string }> = enMessages;
    const jaCoversEn: Record<keyof typeof enMessages, { message: string }> = jaMessages;

    expect(Object.keys(enCoversJa).sort()).toEqual(Object.keys(jaCoversEn).sort());
  });

  it('every data-i18n key used in HTML exists in every locale', () => {
    const keysInHtml = new Set<string>();

    for (const html of htmlSources) {
      for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g)) {
        if (key !== undefined) {
          keysInHtml.add(key);
        }
      }
    }

    expect(0 < keysInHtml.size).toBe(true);

    for (const [locale, messages] of localeEntries) {
      for (const key of keysInHtml) {
        expect(messages[key]?.message, `${locale}: ${key}`).toBeTruthy();
      }
    }
  });
});
