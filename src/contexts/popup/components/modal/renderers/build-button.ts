const templateButton = document.createElement('button');

templateButton.type = 'button';

export const buildButton = (label: string, onClick: () => void) => {
  const button = templateButton.cloneNode() as HTMLButtonElement;

  button.textContent = label;
  button.addEventListener('click', onClick);

  return button;
};
