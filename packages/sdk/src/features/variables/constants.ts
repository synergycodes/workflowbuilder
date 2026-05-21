import type { VariableType, VariableTypePrimitive } from '../../node/node-output-schema';

export type LogicalOperator = 'OR' | 'AND';

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
  type: VariableTypePrimitive;
  baseType: VariableTypePrimitive;
  label: string;
};

export const variableTypeInfoByType: Record<VariableTypePrimitive, VariableTypeOption> = {
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
  // Possible in future?
  // email: {
  //   type: 'email',
  //   baseType: 'string',
  //   label: 'Email',
  // },
  // url: {
  //   type: 'url',
  //   baseType: 'string',
  //   label: 'URL',
  // },
};

// Remove filter when other formats will be supported
export const variableTypesOptions: VariableTypeOption[] = Object.values(variableTypeInfoByType).filter(
  ({ type, baseType }) => type === baseType,
);

export const variablesTypesToExcludeNonPrimitive: VariableType[] = ['object', 'array'];

export const variablesTypesToExcludeInText: VariableType[] = [...variablesTypesToExcludeNonPrimitive, 'boolean'];
