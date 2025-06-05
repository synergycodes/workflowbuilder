import { DynamicCondition } from '../types/controls';

const numberComparisonsOperators = new Set([
  'isGreaterThan',
  'isLessThan',
  'isLessThanOrEqual',
  'isGreaterThanOrEqual',
]);

function getIsNumber(variable: string) {
  return !Number.isNaN(Number(variable)) && variable.trim() !== '';
}

export type LogicalOperator = 'OR' | 'AND';

export const comparisonsOperators = [
  'isEqual',
  'isNotEqual',
  'isGreaterThan',
  'isLessThan',
  'isLessThanOrEqual',
  'isGreaterThanOrEqual',
  'isContaining',
  'isNotContaining',
] as const;

export type ComparisonOperator = (typeof comparisonsOperators)[number];

export function conditionsToDependencies(conditions: DynamicCondition[]): string[] {
  return conditions.reduce((stack: string[], condition) => {
    if (condition.x.startsWith('{{') && !stack.includes(condition.x)) {
      stack.push(condition.x);
    }

    if (condition.y.startsWith('{{') && !stack.includes(condition.y)) {
      stack.push(condition.y);
    }

    return stack;
  }, []);
}

export function validateCondition(condition: Partial<DynamicCondition>) {
  const isNumberComparison =
    condition.comparisonOperator && numberComparisonsOperators.has(condition.comparisonOperator);

  if (isNumberComparison) {
    const isRegularStringX = !condition.x || (!condition.x.startsWith('{{') && !getIsNumber(condition.x));
    const isRegularStringY = !condition.y || (!condition.y.startsWith('{{') && !getIsNumber(condition.y));

    return {
      x: isRegularStringX,
      comparisonOperator: isRegularStringX || isRegularStringY,
      y: isRegularStringY,
    };
  }

  return {
    x: !condition.x,
    y: !condition.y,
  };
}
