type Substitutions = Parameters<typeof chrome.i18n.getMessage>[1] | number;

export const getMessage = (key: string, substitutions?: Substitutions) =>
  chrome.i18n.getMessage(key, typeof substitutions === 'number' ? [substitutions] : substitutions);
