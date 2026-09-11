import { Context } from '@temporalio/activity';
import { type NodeExecutorRegistry, TransientNodeExecutionError } from '@workflowbuilder/temporal';

import { evaluateCondition } from './evaluate-condition';
import type { SampleNode } from './nodes';

export const executors: NodeExecutorRegistry<SampleNode> = {
  trigger: (_node, context) => ({ output: context.triggerPayload }),

  action: (node) => {
    // Executors run inside the plugin's executeNode Activity, so Temporal's activity context
    // is available. Failing the first attempt on purpose makes the retry that follows visible
    // in Event History; the retry itself is Temporal's, not this code's.
    const { attempt } = Context.current().info;
    if (attempt === 1) {
      throw new TransientNodeExecutionError(
        'mail_server_busy',
        'Simulated outage on the first attempt. Temporal retries this activity.',
      );
    }
    return { output: { delivered: true, attempt, message: node.config.message ?? '' } };
  },

  condition: (node, context) => {
    const expression = node.config.condition ?? '';
    return { output: { expression, matched: evaluateCondition(expression, context.triggerPayload) } };
  },
};
