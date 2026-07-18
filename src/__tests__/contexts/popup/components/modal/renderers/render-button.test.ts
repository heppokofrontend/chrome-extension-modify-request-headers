import { describe, it, expect, vi } from 'vitest';

import { renderButton } from '@/contexts/popup/components/modal/renderers';

describe('renderButton', () => {
  it('creates a button element with the given label as its text', () => {
    const button = renderButton('OK', () => {});

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('OK');
  });

  it('invokes onClick when the button is clicked', () => {
    const onClick = vi.fn();
    const button = renderButton('OK', onClick);

    button.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
