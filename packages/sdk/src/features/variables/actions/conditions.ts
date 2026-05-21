import type { DynamicCondition } from '../../../types/controls';
import { numberComparisonsOperators } from '../constants';
import { getIsWrongTypeButAcceptable } from './get-is-wrong-type-but-acceptable';
import { getStringType } from './get-string-type';

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

export type ConditionErrors = {
  [K in keyof DynamicCondition]: boolean;
};

export function getConditionErrors(condition: Partial<DynamicCondition>): ConditionErrors {
  const validity: ConditionErrors = {
    x: false,
    comparisonOperator: false,
    y: false,
    logicalOperator: false,
  };

  // The type of x defines the type of the entire condition.
  const xType = getStringType(condition.x);
  const yType = getStringType(condition.y);

  if (xType !== yType) {
    const isWrongTypeButAcceptable = getIsWrongTypeButAcceptable({
      expectedType: xType,
      value: condition.y,
    });

    if (!isWrongTypeButAcceptable) {
      validity.y = true;
    }
  }

  if (xType === 'number') {
    const isNumberComparison =
      condition.comparisonOperator && numberComparisonsOperators.includes(condition.comparisonOperator);

    if (!isNumberComparison) {
      validity.comparisonOperator = true;
    }
  }

  return validity;
}
