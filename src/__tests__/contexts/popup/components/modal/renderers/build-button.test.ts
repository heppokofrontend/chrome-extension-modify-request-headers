import { describe, it, expect, vi } from 'vitest';

import { buildButton } from '@/contexts/popup/components/modal/renderers';

describe('buildButton', () => {
  it('creates a button element with the given label as its text', () => {
    const button = buildButton('OK', () => {});

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('OK');
  });

  it('invokes onClick when the button is clicked', () => {
    const onClick = vi.fn();
    const button = buildButton('OK', onClick);

    button.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
