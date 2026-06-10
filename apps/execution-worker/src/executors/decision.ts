// Decision executor — picks the first matching branch.
import { type ExecutionContext, NodeExecutionError, resolveTemplate } from '@workflow-builder/execution-core';

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

  // No silent fallback — surface misconfigured decisions as node_failed.
  // Authors must design an explicit catch-all branch (one with no conditions,
  // or whose conditions are tautologically true).
  throw new NodeExecutionError(
    'no_branch_matched',
    `Decision node has no matching branch (evaluated ${node.config.decisionBranches.length} branch(es)) and no default. Add an explicit catch-all branch with no conditions, or fix the existing conditions to cover every input.`,
  );
}

function branchMatches(conditions: DecisionBranchCondition[], context: ExecutionContext): boolean {
  // A branch with no conditions is the explicit catch-all — the contract the
  // error above instructs authors to use, and what the reference Sales
  // Inquiry template ships ('General' branch). First-match order still
  // applies, so a catch-all only fires when placed after conditional branches.
  if (conditions.length === 0) return true;

  let result = evaluateCondition(conditions[0]!, context);
  for (let index = 1; index < conditions.length; index++) {
    const condition = conditions[index]!;
    const value = evaluateCondition(condition, context);
    result = condition.logicalOperator === 'OR' ? result || value : result && value;
  }
  return result;
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
      return new Date(left).getTime() <= new Date(right).getTime();
    }
    case 'isAfter': {
      return new Date(left).getTime() >= new Date(right).getTime();
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
