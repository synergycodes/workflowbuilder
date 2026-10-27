import { type ExecutionContext, PermanentNodeExecutionError } from '@workflowbuilder/temporal';

import type { SampleComparisonOperator, SampleCondition, SampleDecisionBranch } from './nodes';

type OperandContext = Pick<ExecutionContext, 'triggerPayload' | 'nodeOutputs'>;

const REFERENCE = /\{\{([^}]*)\}\}/g;
const PATH = /^\s*(nodes|trigger)\.([\w-]+(?:\.[\w-]+)*)\s*$/;

// The editor appends new branches after "Otherwise" and cannot reorder them, so a branch with no
// rows is the fallback wherever it sits: the first branch whose rows hold wins, else the first empty one.
export function pickBranch(branches: SampleDecisionBranch[], context: OperandContext): SampleDecisionBranch {
  const winner =
    branches.find((branch) => branch.conditions.length > 0 && conditionsHold(branch.conditions, context)) ??
    branches.find((branch) => branch.conditions.length === 0);

  if (!winner) {
    throw new PermanentNodeExecutionError(
      'no_branch_matched',
      `None of the ${branches.length} branch(es) matched. Add a branch with no conditions to catch everything else.`,
    );
  }

  return winner;
}

function conditionsHold(conditions: SampleCondition[], context: OperandContext): boolean {
  let result = true;

  for (const [index, condition] of conditions.entries()) {
    const holds = compare(
      resolveOperand(condition.x, context),
      condition.comparisonOperator,
      resolveOperand(condition.y, context),
    );

    if (index === 0) {
      result = holds;
    } else {
      result = condition.logicalOperator === 'OR' ? result || holds : result && holds;
    }
  }

  return result;
}

function resolveOperand(operand: string, context: OperandContext): string {
  return operand.replaceAll(REFERENCE, (reference, body: string) => {
    const match = PATH.exec(body);
    if (!match) {
      throw new PermanentNodeExecutionError(
        'operand_invalid',
        `Cannot read "${reference}". Expected {{trigger.<field>}} or {{nodes.<nodeId>.<field>}}.`,
      );
    }

    const value = valueAtPath(match[1] === 'nodes' ? context.nodeOutputs : context.triggerPayload, match[2]!);
    if (value === undefined) {
      throw new PermanentNodeExecutionError('operand_unresolved', `Nothing at "${reference}" in this run.`);
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

function valueAtPath(root: unknown, path: string): unknown {
  let current = root;

  for (const key of path.split('.')) {
    // Own keys only, or `{{trigger.constructor}}` would resolve off Object.prototype.
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function compare(left: string, operator: SampleComparisonOperator, right: string): boolean {
  switch (operator) {
    case 'isEqual': {
      return left === right;
    }
    case 'isNotEqual': {
      return left !== right;
    }
    case 'isGreaterThan': {
      return toNumber(left) > toNumber(right);
    }
    case 'isLessThan': {
      return toNumber(left) < toNumber(right);
    }
    case 'isGreaterThanOrEqual': {
      return toNumber(left) >= toNumber(right);
    }
    case 'isLessThanOrEqual': {
      return toNumber(left) <= toNumber(right);
    }
    case 'isContaining': {
      return left.toLowerCase().includes(right.toLowerCase());
    }
    case 'isNotContaining': {
      return !left.toLowerCase().includes(right.toLowerCase());
    }
    case 'isBefore': {
      return Date.parse(left) < Date.parse(right);
    }
    case 'isAfter': {
      return Date.parse(left) > Date.parse(right);
    }
    default: {
      throw new PermanentNodeExecutionError(
        'operator_unknown',
        `Unsupported comparison operator "${String(operator)}".`,
      );
    }
  }
}

// Number('') is 0 and NaN compares false, so either would quietly pick the wrong branch.
function toNumber(operand: string): number {
  const value = Number(operand);
  if (operand.trim() === '' || Number.isNaN(value)) {
    throw new PermanentNodeExecutionError('operand_not_a_number', `Expected a number, got "${operand}".`);
  }

  return value;
}
