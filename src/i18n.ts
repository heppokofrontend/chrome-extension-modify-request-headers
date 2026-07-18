import { getMessage } from '@/utils';

const targets = document.querySelectorAll<HTMLElement>('[data-i18n]');

for (const elm of targets) {
  const { i18n } = elm.dataset;

  if (i18n === undefined || i18n === '') {
    continue;
  }

  const textContent = getMessage(i18n);

  if (textContent) {
    elm.textContent = textContent;
  }
}

const ariaLabelTargets = document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]');

for (const elm of ariaLabelTargets) {
  const key = elm.dataset['i18nAriaLabel'];

  if (key === undefined || key === '') {
    continue;
  }

  const label = getMessage(key);

  if (label) {
    elm.setAttribute('aria-label', label);
  }
}

const primaryLanguage = chrome.i18n.getUILanguage().split(/[-_]/)[0];
document.documentElement.lang = primaryLanguage === 'ja' ? 'ja' : 'en';
