export const capitalizeFirstLetter = (text: string | undefined = '') =>
  text ? text[0].toUpperCase() + text.slice(1) : text;

export const truncate = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

/**
 * Digits stay in the word they touch (`2nd`, `line1`); separators and case changes split words.
 * Latin letters and digits only, anything else is dropped.
 */
const WORD_REGEX = /[A-Z]+\d*(?![a-z])|[A-Z]?[a-z]+\d*|\d+[a-z]*/g;

const splitWords = (text: string): string[] => {
  const hasSeparator = /[\s_]/.test(text);

  return text
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((segment) => (hasSeparator ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase() : segment))
    .flatMap((segment) => segment.match(WORD_REGEX) ?? []);
};

export const keyToLabel = (key: string): string => {
  if (!key) {
    return '';
  }

  return splitWords(key)
    .map((word, index) => {
      if (/^[A-Z]+\d*$/.test(word)) {
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

export const pathToLabel = (path: string): string => {
  if (!path) {
    return '';
  }

  if (path.includes('.')) {
    const lastKey = path.split('.').at(-1);
    if (lastKey) {
      return keyToLabel(lastKey);
    }
  }

  return keyToLabel(path);
};

export const labelToSnakeCase = (label: string) =>
  splitWords(label)
    .map((word) => word.toLowerCase())
    .join('_');
