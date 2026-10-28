import { toKebabCase } from 'remeda';

export function toFileName(name: string) {
  const escapedPropertyName = name.replaceAll('/', '-');
  const fileName = toKebabCase(escapedPropertyName);

  return fileName;
}
