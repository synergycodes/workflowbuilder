import StyleDictionary, { TransformedToken } from 'style-dictionary';

const kebabName = StyleDictionary.hooks.transforms['name/kebab'].transform;

export function cssVariableName(token: TransformedToken): string {
  return String(kebabName(token, {}, {})).replace(/^wb-/, 'wb-ds-');
}
