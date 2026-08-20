export const capitalizeFirstLetter = (text: string | undefined = '') =>
  text ? text[0].toUpperCase() + text.slice(1) : text;

export const truncate = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

const floorCaseToPascalCase = (text: string): string => {
  const textWithoutSpaces = text.replaceAll(' ', '_');
  if (textWithoutSpaces.includes('_') === false) {
    return text;
  }

  return textWithoutSpaces
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

export const keyToLabel = (key: string): string => {
  if (!key) {
    return '';
  }
  const pascalCaseKey = floorCaseToPascalCase(key);

  const words = pascalCaseKey.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+/g) ?? [];
  return words
    .map((word, index) => {
      if (/^[A-Z]+$/.test(word)) {
        // Preserve acronyms like ID, HTML, API
        return word;
      }

      if (['id', 'api', 'html'].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }

      const lower = word.toLowerCase();

      return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
};

export const labelToFloorCase = (label: string) => {
  // Normalization guessing the best strategy
  const labelToUse = label.replaceAll(' ', '_');
  const pascalCaseLabel = floorCaseToPascalCase(labelToUse);

  const words = pascalCaseLabel.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) ?? [];

  return words.map((word) => word.toLowerCase()).join('_');
};
