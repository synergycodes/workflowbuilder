import { type ExecutionContext, NodeExecutionError, resolveTemplate } from '@workflow-builder/execution-core';
import type { DemoCondition } from '@workflow-builder/types/workflow-execution/demo-execution';

export type ConditionEvaluation = {
  result: boolean;
  matchedCondition: string;
};

export function evaluateConditions(conditions: DemoCondition[], context: ExecutionContext): ConditionEvaluation {
  if (conditions.length === 0) {
    return { result: false, matchedCondition: '' };
  }

  const matchingIndexes: number[] = [];
  let result = evaluateCondition(conditions[0]!, context);
  if (result) matchingIndexes.push(0);

  for (let index = 1; index < conditions.length; index++) {
    const condition = conditions[index]!;
    const conditionResult = evaluateCondition(condition, context);
    if (conditionResult) matchingIndexes.push(index);
    result = condition.logicalOperator === 'OR' ? result || conditionResult : result && conditionResult;
  }

  return {
    result,
    matchedCondition: result ? `conditions:${matchingIndexes.join(',')}` : '',
  };
}

export function evaluateCondition(condition: DemoCondition, context: ExecutionContext): boolean {
  const left = resolveTemplate(condition.x, context);
  const right = resolveTemplate(condition.y, context);

  switch (condition.comparisonOperator) {
    case 'isEqual': {
      return left === right;
    }
    case 'isNotEqual': {
      return left !== right;
    }
    case 'isContaining': {
      return left.toLowerCase().includes(right.toLowerCase());
    }
    case 'isNotContaining': {
      return !left.toLowerCase().includes(right.toLowerCase());
    }
    case 'isBefore': {
      return parseDate(left, condition.comparisonOperator) <= parseDate(right, condition.comparisonOperator);
    }
    case 'isAfter': {
      return parseDate(left, condition.comparisonOperator) >= parseDate(right, condition.comparisonOperator);
    }
    case 'isGreaterThan': {
      return parseNumber(left, condition.comparisonOperator) > parseNumber(right, condition.comparisonOperator);
    }
    case 'isLessThan': {
      return parseNumber(left, condition.comparisonOperator) < parseNumber(right, condition.comparisonOperator);
    }
    case 'isGreaterThanOrEqual': {
      return parseNumber(left, condition.comparisonOperator) >= parseNumber(right, condition.comparisonOperator);
    }
    case 'isLessThanOrEqual': {
      return parseNumber(left, condition.comparisonOperator) <= parseNumber(right, condition.comparisonOperator);
    }
    default: {
      throw new NodeExecutionError(
        'unsupported_condition_operator',
        `Unsupported condition operator: ${String(condition.comparisonOperator)}`,
      );
    }
  }
}

function parseNumber(value: string, operator: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new NodeExecutionError('invalid_condition_operand', `Operator ${operator} requires finite numeric operands`);
  }
  return parsed;
}

function parseDate(value: string, operator: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new NodeExecutionError('invalid_condition_operand', `Operator ${operator} requires valid date operands`);
  }
  return parsed;
}
