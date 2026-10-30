import type { JsonSchema7 } from '@jsonforms/core';

import type { FlattenedPropertiesIndex } from '@workflow-builder/types/variables/node-output-schema';

import { getIsSupportedVariableType } from './get-is-supported-variable-type';

type Params = {
  properties: JsonSchema7['properties'];
  namePrefix: string;
  rootSchema: JsonSchema7;
  /** `$ref`s followed on the current path; meeting one again means a recursive definition, which stops there. */
  refChain: ReadonlySet<string>;
};

type ResolvedSchema = {
  schema: JsonSchema7;
  refChain: ReadonlySet<string>;
};

function decodePointerSegment(segment: string): string {
  return decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~');
}

/** Only refs into the same document (`#`, `#/$defs/x`, `#/definitions/x`); there is no registry for `/schemas/x` or URLs. */
function getSchemaByLocalRef(ref: string, rootSchema: JsonSchema7): JsonSchema7 | undefined {
  if (ref === '#') {
    return rootSchema;
  }

  if (!ref.startsWith('#/')) {
    return undefined;
  }

  const target = ref
    .slice(2)
    .split('/')
    .map(decodePointerSegment)
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === 'object' && Object.hasOwn(node, segment)
          ? (node as Record<string, unknown>)[segment]
          : undefined,
      rootSchema,
    );

  return target && typeof target === 'object' ? (target as JsonSchema7) : undefined;
}

/** Follows `$ref` chains. Keywords next to a `$ref` (`title`, `description`) override the target's, as in draft 2019-09. */
function resolveSchemaReferences(
  schema: JsonSchema7,
  rootSchema: JsonSchema7,
  refChain: ReadonlySet<string>,
): ResolvedSchema | undefined {
  let current = schema;
  let chain = refChain;

  while (typeof current.$ref === 'string') {
    const { $ref, ...siblings } = current;

    if (chain.has($ref)) {
      return undefined;
    }

    const target = getSchemaByLocalRef($ref, rootSchema);

    if (!target) {
      return undefined;
    }

    chain = new Set(chain).add($ref);
    current = { ...target, ...siblings };
  }

  return { schema: current, refChain: chain };
}

function getFlattenedPropertiesFromJsonSchema7Properties({
  properties,
  namePrefix,
  rootSchema,
  refChain,
}: Params): FlattenedPropertiesIndex {
  if (!properties) {
    return {};
  }

  const fields = Object.entries(properties).reduce((stack: FlattenedPropertiesIndex, [fieldName, rawField]) => {
    const propertyName = [namePrefix, fieldName].filter(Boolean).join('.');
    const resolved = resolveSchemaReferences(rawField, rootSchema, refChain);

    if (!resolved) {
      return stack;
    }

    const { schema: field, refChain: fieldRefChain } = resolved;

    if (getIsSupportedVariableType(field.type)) {
      const isDate = field.type === 'string' && field.format === 'date-time';
      stack[propertyName] = {
        type: isDate ? 'datetime' : field.type,
        label: field.title || '',
        description: field.description || '',
      };
    }

    if (field.type === 'object') {
      const objectFields = getFlattenedPropertiesFromJsonSchema7Properties({
        properties: field.properties,
        namePrefix: propertyName,
        rootSchema,
        refChain: fieldRefChain,
      });

      stack = {
        ...stack,
        ...objectFields,
      };
    }

    return stack;
  }, {});

  return fields;
}

export function getFlattenedPropertiesFromJsonSchema7(schema: JsonSchema7): FlattenedPropertiesIndex {
  const resolved = resolveSchemaReferences(schema, schema, new Set());

  if (resolved?.schema.type !== 'object') {
    return {};
  }

  return getFlattenedPropertiesFromJsonSchema7Properties({
    properties: resolved.schema.properties,
    namePrefix: '',
    rootSchema: schema,
    refChain: resolved.refChain,
  });
}
