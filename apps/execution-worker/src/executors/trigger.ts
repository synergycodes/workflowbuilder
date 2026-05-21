// Trigger executor — passes through the trigger payload as output.
import type { ExecutionContext } from '@workflow-builder/execution-core';

import type { TriggerNode } from '../domain/ai-studio-nodes';

export function executeTrigger(_node: TriggerNode, context: ExecutionContext) {
  return { output: context.triggerPayload };
}
