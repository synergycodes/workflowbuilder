// Builds the AI Agent executor, and decides what happens when no LLM key is set.
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import { type LoggerPort, NodeExecutionError, type NodeExecutor } from '@workflow-builder/execution-core';

import { executeAiAgent } from '../activities/ai-agent';
import type { AiAgentNode } from '../domain/ai-studio-nodes';

type AiAgentExecutorOptions = {
  // Null when no key is configured. The worker still boots; only this node type
  // is unavailable, so a graph of Trigger/Decision/Visualize nodes runs fine.
  apiKey: string | null;
  baseURL: string;
  modelId: string;
  logger?: LoggerPort;
  tavilyApiKey?: string;
};

export function createAiAgentExecutor(options: AiAgentExecutorOptions): NodeExecutor<AiAgentNode> {
  const { apiKey, baseURL, modelId, logger, tavilyApiKey } = options;

  if (!apiKey) {
    // Thrown when the node is reached rather than at boot, so a missing key
    // costs one failed node instead of the whole worker. The node activity
    // profile retries it once — harmless, since nothing here can succeed on a
    // second attempt.
    return () => {
      throw new NodeExecutionError(
        'ai_not_configured',
        'AI is not configured on this worker — set AI_API_KEY (see apps/execution-worker/.env.example).',
      );
    };
  }

  const provider = createOpenAICompatible({ name: 'ai', baseURL, apiKey });
  const model = provider.chatModel(modelId);

  return (node, context) => executeAiAgent(node, context, { model, logger, tavilyApiKey });
}
