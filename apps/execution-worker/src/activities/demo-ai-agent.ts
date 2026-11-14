import { generateText } from 'ai';

import {
  type ExecutionContext,
  type LoggerPort,
  NodeExecutionError,
  resolveTemplate,
} from '@workflow-builder/execution-core';
import type { DemoAiAgentNode, DemoAiAgentOutput } from '@workflow-builder/types/workflow-execution/demo-execution';

export type DemoAiAgentDependencies = {
  apiKey?: string;
  modelId: string;
  createModel: (
    apiKey: string,
    modelId: string,
  ) => Parameters<typeof generateText>[0]['model'] | Promise<Parameters<typeof generateText>[0]['model']>;
  generate?: typeof generateText;
  logger?: LoggerPort;
};

export async function executeDemoAiAgent(
  node: DemoAiAgentNode,
  context: ExecutionContext,
  dependencies: DemoAiAgentDependencies,
) {
  if (!dependencies.apiKey) {
    throw new NodeExecutionError(
      'ai_provider_not_configured',
      'AI execution is unavailable because the OpenRouter API key is not configured',
    );
  }

  const systemPrompt = resolveTemplate(node.config.systemPrompt, context);
  const prompt = buildUserPrompt(context);

  try {
    const result = await (dependencies.generate ?? generateText)({
      model: await dependencies.createModel(dependencies.apiKey, dependencies.modelId),
      system: systemPrompt,
      prompt,
    });
    const output: DemoAiAgentOutput = {
      response: result.text,
      tokensUsed: result.totalUsage.totalTokens ?? 0,
      model: result.response.modelId || dependencies.modelId,
    };
    return { output };
  } catch (error) {
    const classified = classifyOpenRouterError(error);
    dependencies.logger?.error('demo llm call failed', {
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: node.id,
      error: { message: classified.message, code: classified.code },
    });
    throw classified;
  }
}

function buildUserPrompt(context: ExecutionContext): string {
  const previousOutputs = Object.entries(context.nodeOutputs);
  if (previousOutputs.length === 0) {
    return Object.keys(context.triggerPayload).length === 0
      ? 'Execute.'
      : `Trigger payload:\n${JSON.stringify(context.triggerPayload)}`;
  }

  return `Context from previous steps:\n\n${previousOutputs
    .map(([nodeId, output]) => `[${nodeId}]:\n${stringifyOutput(output)}`)
    .join('\n\n')}`;
}

function stringifyOutput(output: unknown): string {
  if (typeof output === 'string') return output;
  if (typeof output === 'object' && output !== null) {
    const record = output as Record<string, unknown>;
    if (typeof record['response'] === 'string') return record['response'];
  }
  return JSON.stringify(output);
}

export function classifyOpenRouterError(error: unknown): NodeExecutionError {
  if (error instanceof NodeExecutionError) return error;

  const status = extractStatus(error);
  if (status === 401 || status === 403) {
    return new NodeExecutionError('ai_provider_auth_failed', 'OpenRouter rejected the configured API key', {
      cause: error,
    });
  }
  if (status === 429) {
    return new NodeExecutionError('ai_provider_request_failed', 'The AI provider rate limit was exceeded', {
      cause: error,
    });
  }
  if (typeof status === 'number' && status >= 500) {
    return new NodeExecutionError('ai_provider_request_failed', 'The AI provider is temporarily unavailable', {
      cause: error,
    });
  }
  return new NodeExecutionError('ai_provider_request_failed', 'The AI provider could not complete the request', {
    cause: error,
  });
}

function extractStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record['statusCode'] === 'number') return record['statusCode'];
  if (typeof record['status'] === 'number') return record['status'];
  const response = record['response'];
  if (typeof response === 'object' && response !== null) {
    const responseStatus = (response as Record<string, unknown>)['status'];
    if (typeof responseStatus === 'number') return responseStatus;
  }
  const cause = record['cause'];
  return cause === undefined ? undefined : extractStatus(cause);
}
