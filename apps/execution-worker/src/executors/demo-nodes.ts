import type { ExecutionContext } from '@workflow-builder/execution-core';
import type {
  DemoActionNode,
  DemoActionOutput,
  DemoConditionalNode,
  DemoConditionalOutput,
  DemoDecisionNode,
  DemoDecisionOutput,
  DemoMultiPortOutput,
  DemoNotificationNode,
  DemoNotificationOutput,
  DemoTriggerNode,
  DemoTriggerOutput,
} from '@workflow-builder/types/workflow-execution/demo-execution';

import { evaluateConditions } from './demo-condition-evaluator';

export function executeDemoTrigger(_node: DemoTriggerNode, context: ExecutionContext) {
  const output: DemoTriggerOutput = {
    eventType: 'manual',
    timestamp: new Date().toISOString(),
    payload: context.triggerPayload,
  };
  return { output };
}

export function executeDemoAction(node: DemoActionNode) {
  const output: DemoActionOutput = {
    status: 'success',
    result: {
      simulated: true,
      performed: false,
      actionType: node.config.type,
    },
    errorMessage: '',
  };
  return { output };
}

export function executeDemoConditional(node: DemoConditionalNode, context: ExecutionContext) {
  const evaluation = evaluateConditions(node.config.conditionsArray, context);
  const output: DemoConditionalOutput = evaluation;
  return { output, nextPort: evaluation.result ? 'true' : 'false' };
}

export function executeDemoDecision(node: DemoDecisionNode, context: ExecutionContext) {
  for (const [branchIndex, branch] of node.config.decisionBranches.entries()) {
    if (evaluateConditions(branch.conditions, context).result) {
      const output: DemoDecisionOutput = {
        selectedBranch: branch.label,
        branchIndex,
      };
      return { output, nextPort: branch.sourceHandle };
    }
  }

  const output: DemoDecisionOutput = {
    selectedBranch: 'Default',
    branchIndex: node.config.decisionBranches.length,
  };
  return { output, nextPort: 'default' };
}

export function executeDemoNotification(node: DemoNotificationNode) {
  const output: DemoNotificationOutput = {
    sent: false,
    sentAt: new Date().toISOString(),
    recipient: node.config.recipient ?? '',
    channel: node.config.type,
  };
  return { output };
}

export function executeDemoMultiPort() {
  const output: DemoMultiPortOutput = { routed: true };
  return { output };
}
