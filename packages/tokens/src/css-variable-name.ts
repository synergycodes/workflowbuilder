import StyleDictionary, { TransformedToken } from 'style-dictionary';

const kebabName = StyleDictionary.hooks.transforms['name/kebab'].transform;

export function cssVariableName(token: TransformedToken): string {
  const name = String(kebabName(token, {}, {}));
  if (!name.startsWith('wb-')) {
    throw new Error(`Expected token name to start with "wb-", received "${name}"`);
  }
  return name.replace(/^wb-/, 'wb-ds-');
}
