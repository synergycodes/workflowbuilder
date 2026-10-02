import type { VariableType, VariableTypePrimitive } from '@workflow-builder/types/node-output-schema';

export const NODE_ID_FOR_COMMON_NODE_DATA = '<NODE_ID>';
export const NODE_LABEL_FOR_COMMON_NODE_DATA = '<NODE_LABEL>';

export const LOGICAL_OPERATOR = {
  OR: 'OR',
  AND: 'AND',
} as const;
export type LogicalOperator = (typeof LOGICAL_OPERATOR)[keyof typeof LOGICAL_OPERATOR];

/**
 * String literal union of comparison operators recognised by the
 * dynamic-conditions / decision-branches controls (`'isEqual'`,
 * `'isGreaterThan'`, `'isContaining'`, …).
 *
 * @category Forms
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const comparisonsOperators = [
  'isEqual',
  'isNotEqual',
  'isGreaterThan',
  'isLessThan',
  'isLessThanOrEqual',
  'isGreaterThanOrEqual',
  'isContaining',
  'isNotContaining',
  'isBefore',
  'isAfter',
] as const;

export type ComparisonOperator = (typeof comparisonsOperators)[number];

const stringOperators: ComparisonOperator[] = ['isEqual', 'isNotEqual', 'isContaining', 'isNotContaining'];

export const numberComparisonsOperators: ComparisonOperator[] = [
  'isEqual',
  'isNotEqual',
  'isGreaterThan',
  'isGreaterThanOrEqual',
  'isLessThan',
  'isLessThanOrEqual',
];

const booleanOperators: ComparisonOperator[] = ['isEqual', 'isNotEqual'];

const dateOperators: ComparisonOperator[] = ['isEqual', 'isNotEqual', 'isBefore', 'isAfter'];

export const comparisonOperatorsByPrimitiveType: Record<VariableTypePrimitive, ComparisonOperator[]> = {
  string: stringOperators,
  number: numberComparisonsOperators,
  boolean: booleanOperators,
  date: dateOperators,
  datetime: dateOperators,
};

export const VARIABLE_BRACKETS_START = '{{';
export const VARIABLE_BRACKETS_END = '}}';
export const VARIABLE_DELIMITER = ' · ';

/**
 * Reserved key under which the variable-text control looks up the
 * available global variables when expanding `{{global.*}}` placeholders.
 * Plugins that compose alternative variable sources should namespace
 * their own keys to avoid colliding with this reserved value.
 *
 * @category Constants
 */
export const VARIABLE_GLOBAL_KEY = 'global';

/**
 * Reserved key under which the variable-text control looks up the
 * available upstream nodes when expanding `{{nodes.*}}` placeholders.
 * Plugins that compose alternative variable sources should namespace
 * their own keys to avoid colliding with this reserved value.
 *
 * @category Constants
 */
export const VARIABLE_NODES_KEY = 'nodes';

type VariableTypeOption = {
  type: VariableType;
  baseType: VariableType;
  label: string;
};

export const variableTypeInfoByType: Record<VariableType, VariableTypeOption> = {
  string: {
    type: 'string',
    baseType: 'string',
    label: 'Text',
  },
  number: {
    type: 'number',
    baseType: 'number',
    label: 'Number',
  },
  boolean: {
    type: 'boolean',
    baseType: 'boolean',
    label: 'Boolean',
  },
  date: {
    type: 'date',
    baseType: 'date',
    label: 'Date',
  },
  datetime: {
    type: 'datetime',
    baseType: 'datetime',
    label: 'Datetime',
  },
  object: {
    type: 'object',
    baseType: 'object',
    label: 'Object',
  },
  array: {
    type: 'array',
    baseType: 'array',
    label: 'Array',
  },
};

export const variableTypesOptions: VariableTypeOption[] = Object.values(variableTypeInfoByType).filter(
  ({ type, baseType }) => type === baseType,
);

export const VARIABLES_TYPES_NOT_PRIMITIVE: VariableType[] = ['object', 'array'];

export const VARIABLES_TYPES_TO_EXCLUDE_IN_TEXT: VariableType[] = [...VARIABLES_TYPES_NOT_PRIMITIVE, 'boolean'];

export const VARIABLES_TYPES_NUMERIC: VariableType[] = ['number'];

export const VARIABLES_TYPES_EMPTY: VariableType[] = []; // module scope

/**
 * Optional buckets in `bySourceHandle`, next to entries keyed by real handle names.
 * None of them has to be present; a handle's own entry is always used on its own.
 *
 * - `every`: added to every handle.
 * - `error`: added to handles whose name contains `error`.
 * - `success`: added to every other handle.
 *
 * The check is a substring match on the handle name, so `onError` or `error-1`
 * count as error handles.
 *
 * A variable may sit in several buckets. Duplicates are dropped by id later,
 * so keep its type the same in each bucket; the type is not resolved per handle.
 */
export const SPECIAL_SOURCE_HANDLE_KEYWORDS = {
  EVERY: 'every',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
