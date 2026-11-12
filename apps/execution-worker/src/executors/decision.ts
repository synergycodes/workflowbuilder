// Decision executor — picks the first matching branch.
import { type ExecutionContext, PermanentNodeExecutionError, resolveTemplate } from '@workflow-builder/execution-core';

import type { DecisionBranchCondition, DecisionNode } from '../domain/ai-studio-nodes';

type DecisionResult = {
  output: { matchedBranch: string };
  nextPort: string;
};

export function executeDecision(node: DecisionNode, context: ExecutionContext): DecisionResult {
  for (const branch of node.config.decisionBranches) {
    if (branchMatches(branch.conditions, context)) {
      return {
        output: { matchedBranch: branch.sourceHandle },
        nextPort: branch.sourceHandle,
      };
    }
  }

  // No silent fallback — surface misconfigured decisions as node_failed. A branch
  // with no conditions never matches, so a catch-all needs an always-true condition
  // until a branch can be marked as the default (follow-up: decision-default-branch).
  throw new PermanentNodeExecutionError(
    'no_branch_matched',
    `Decision node has no matching branch (evaluated ${node.config.decisionBranches.length} branch(es)) and no default. Add a catch-all branch whose condition is always true (for example "isEqual" with the same value on both sides), or fix the existing conditions to cover every input.`,
  );
}

function branchMatches(conditions: DecisionBranchCondition[], context: ExecutionContext): boolean {
  if (conditions.length === 0) return false;

  let result = evaluateCondition(conditions[0]!, context);
  for (let index = 1; index < conditions.length; index++) {
    const condition = conditions[index]!;
    const value = evaluateCondition(condition, context);
    result = condition.logicalOperator === 'OR' ? result || value : result && value;
  }
  return result;
}

const bareTimePattern = /^\d{2}:\d{2}/;
const clockPattern = /^(?:\d{4}-\d{2}-\d{2}T)?(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;

function getSecondsOfDay(value: string): number | undefined {
  const match = clockPattern.exec(value);

  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0) : undefined;
}

/** A bare `HH:mm[:ss]` has no day, so it orders by clock: against another clock or the one inside a datetime. */
function compareInstants(left: string, right: string, compare: (a: number, b: number) => boolean): boolean {
  const leftTrimmed = left.trim();
  const rightTrimmed = right.trim();

  if (bareTimePattern.test(leftTrimmed) || bareTimePattern.test(rightTrimmed)) {
    const leftSeconds = getSecondsOfDay(leftTrimmed);
    const rightSeconds = getSecondsOfDay(rightTrimmed);

    return leftSeconds !== undefined && rightSeconds !== undefined && compare(leftSeconds, rightSeconds);
  }

  return compare(new Date(left).getTime(), new Date(right).getTime());
}

function evaluateCondition(condition: DecisionBranchCondition, context: ExecutionContext): boolean {
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
      return compareInstants(left, right, (a, b) => a <= b);
    }
    case 'isAfter': {
      return compareInstants(left, right, (a, b) => a >= b);
    }
    case 'isGreaterThan': {
      return Number(left) > Number(right);
    }
    case 'isLessThan': {
      return Number(left) < Number(right);
    }
    case 'isGreaterThanOrEqual': {
      return Number(left) >= Number(right);
    }
    case 'isLessThanOrEqual': {
      return Number(left) <= Number(right);
    }
    default: {
      return false;
    }
  }
}
