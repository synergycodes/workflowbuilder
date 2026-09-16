import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import type { AiConfigResult } from '@workflow-builder/ai-config';
import { type LoggerPort, type NodeExecutor, PermanentNodeExecutionError } from '@workflow-builder/execution-core';

import { executeAiAgent } from '../activities/ai-agent';
import type { AiAgentNode } from '../domain/ai-studio-nodes';

type AiAgentExecutorOptions = {
  // Unavailable is allowed: the worker still boots; only this node type is
  // unavailable, so a graph of Trigger/Decision/Visualize nodes runs fine.
  ai: AiConfigResult;
  logger?: LoggerPort;
  tavilyApiKey?: string;
};

export function createAiAgentExecutor(options: AiAgentExecutorOptions): NodeExecutor<AiAgentNode> {
  const { ai, logger, tavilyApiKey } = options;

  if (!ai.available) {
    const missing = ai.missing.join(', ');
    // Thrown when the node is reached rather than at boot, so missing config
    // costs one failed node instead of the whole worker. Permanent: a retry
    // cannot find configuration that is not there.
    return () => {
      throw new PermanentNodeExecutionError(
        'ai_not_configured',
        `AI is not configured on this worker — set ${missing} (see apps/execution-worker/.env.example).`,
      );
    };
  }

  const { apiKey, baseURL, modelId } = ai.config;
  const provider = createOpenAICompatible({ name: 'ai', baseURL, apiKey });
  const model = provider.chatModel(modelId);

  return (node, context) => executeAiAgent(node, context, { model, logger, tavilyApiKey });
}
