export const FAKE_NUMBER = 100;

export function fakeString(name: string): string {
  return `Fake ${name}`;
}

type Schema = Record<string, unknown>;

function isSchema(value: unknown): value is Schema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveReference(reference: string, root: unknown): unknown {
  let target = root;
  for (const segment of reference.replace(/^#\/?/, '').split('/').filter(Boolean)) {
    target = isSchema(target) ? target[segment.replaceAll('~1', '/').replaceAll('~0', '~')] : undefined;
  }
  return target;
}

function typeOf(schema: Schema): unknown {
  if (Array.isArray(schema['type'])) {
    return schema['type'].find((type) => type !== 'null') ?? 'null';
  }
  if (schema['type'] === undefined && isSchema(schema['properties'])) {
    return 'object';
  }
  return schema['type'];
}

function numberWithin(schema: Schema): number {
  const minimum = typeof schema['minimum'] === 'number' ? schema['minimum'] : Number.NEGATIVE_INFINITY;
  const maximum = typeof schema['maximum'] === 'number' ? schema['maximum'] : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(FAKE_NUMBER, minimum), maximum);
}

function stringFor(schema: Schema, name: string): string {
  if (schema['format'] === 'date') {
    return '2026-01-15';
  }
  if (schema['format'] === 'date-time') {
    return '2026-01-15T12:00:00Z';
  }
  return fakeString(name);
}

/** One fixed value that is valid against the schema: every declared property, the first enum entry, one array item. */
export function valueFromSchema(schema: unknown, name = 'value', root: unknown = schema): unknown {
  if (!isSchema(schema)) {
    return fakeString(name);
  }
  if (typeof schema['$ref'] === 'string') {
    return valueFromSchema(resolveReference(schema['$ref'], root), name, root);
  }
  if ('const' in schema) {
    return schema['const'];
  }
  if (Array.isArray(schema['enum']) && schema['enum'].length > 0) {
    return schema['enum'][0];
  }
  const alternatives = schema['anyOf'] ?? schema['oneOf'];
  if (Array.isArray(alternatives) && alternatives.length > 0) {
    const firstWithValue = alternatives.find((option) => !isSchema(option) || option['type'] !== 'null');
    return valueFromSchema(firstWithValue ?? alternatives[0], name, root);
  }

  switch (typeOf(schema)) {
    case 'object': {
      const properties = isSchema(schema['properties']) ? schema['properties'] : {};
      return Object.fromEntries(
        Object.entries(properties).map(([key, property]) => [key, valueFromSchema(property, key, root)]),
      );
    }
    case 'array': {
      const count = Math.max(1, typeof schema['minItems'] === 'number' ? schema['minItems'] : 1);
      return Array.from({ length: count }, () => valueFromSchema(schema['items'], name, root));
    }
    case 'number':
    case 'integer': {
      return numberWithin(schema);
    }
    case 'boolean': {
      return true;
    }
    case 'null': {
      return null;
    }
    default: {
      return stringFor(schema, name);
    }
  }
}
