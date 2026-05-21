export const capitalize = (text: string | undefined = '') => (text ? text[0].toUpperCase() + text.slice(1) : text);

export const truncate = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
