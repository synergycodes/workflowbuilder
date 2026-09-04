// Builds the AI Agent executor, and decides what happens when the LLM is not configured.
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import { type LoggerPort, type NodeExecutor, PermanentNodeExecutionError } from '@workflow-builder/execution-core';

import { executeAiAgent } from '../activities/ai-agent';
import type { AiAgentNode } from '../domain/ai-studio-nodes';

type AiAgentExecutorOptions = {
  // Each null when not configured. The worker still boots; only this node type
  // is unavailable, so a graph of Trigger/Decision/Visualize nodes runs fine.
  apiKey: string | null;
  baseURL: string | null;
  modelId: string | null;
  logger?: LoggerPort;
  tavilyApiKey?: string;
};

export function createAiAgentExecutor(options: AiAgentExecutorOptions): NodeExecutor<AiAgentNode> {
  const { apiKey, baseURL, modelId, logger, tavilyApiKey } = options;

  if (!apiKey || !baseURL || !modelId) {
    const missing = [
      ...(apiKey ? [] : ['AI_API_KEY']),
      ...(baseURL ? [] : ['AI_BASE_URL']),
      ...(modelId ? [] : ['AI_MODEL']),
    ].join(', ');
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

  const provider = createOpenAICompatible({ name: 'ai', baseURL, apiKey });
  const model = provider.chatModel(modelId);

  return (node, context) => executeAiAgent(node, context, { model, logger, tavilyApiKey });
}
