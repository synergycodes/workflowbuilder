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

// TODO: Remove filter when other formats will be supported
export const variableTypesOptions: VariableTypeOption[] = Object.values(variableTypeInfoByType).filter(
  ({ type, baseType }) => type === baseType,
);

export const variablesTypesToExcludeNonPrimitive: VariableType[] = ['object', 'array'];

export const variablesTypesToExcludeInText: VariableType[] = [...variablesTypesToExcludeNonPrimitive, 'boolean'];

export const variablesTypesNumeric: VariableType[] = ['number'];

/**
 * Special keywords used to determine source-handle behaviour.
 *
 * Source handles may have arbitrary names, but handles containing one of these
 * keywords are treated specially when processing `bySourceHandle`.
 *
 * - `EVERY` (`every`): Values assigned to this handle are additionally attached
 *   to every branch. `every` values are always forwarded.
 * - `SUCCESS` (`success`): A branch is considered successful when its source
 *   handle does not contain the `ERROR` keyword. Successful branches receive
 *   the values assigned to this handle in addition to their own values.
 * - `ERROR` (`error`): Values assigned to this handle are additionally attached
 *   to every branch whose source handle contains the `ERROR` keyword.
 *
 * The keywords are matched against the source-handle name, so source handles
 * can have custom names while still triggering the corresponding behaviour.
 */
export const SPECIAL_SOURCE_HANDLE_KEYWORDS = {
  EVERY: 'every',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
