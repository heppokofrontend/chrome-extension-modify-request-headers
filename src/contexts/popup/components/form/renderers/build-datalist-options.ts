/** 値の配列から空文字と重複を除いた <option> 要素の配列を組み立てる。 */
export const buildDatalistOptions = (values: string[]) =>
  [...new Set(values)]
    .filter((value) => value !== '')
    .map((value) => {
      const option = document.createElement('option');
      option.value = value;
      return option;
    });
