import { Output, generateText, jsonSchema, stepCountIs } from 'ai';

import {
  type ExecutionContext,
  type LoggerPort,
  NodeExecutionError,
  resolveTemplate,
} from '@workflow-builder/execution-core';

import type { AiAgentNode } from '../domain/ai-studio-nodes';
import { createWebSearchTool } from '../tools/web-search';
import { classifyProviderError } from './provider-error';

// Bounds the agentic tool loop so a misbehaving model can't run up cost.
const MAX_TOOL_STEPS = 4;

type AiAgentDeps = {
  model: Parameters<typeof generateText>[0]['model'];
  logger?: LoggerPort;
  tavilyApiKey?: string;
};

export async function executeAiAgent(node: AiAgentNode, context: ExecutionContext, deps: AiAgentDeps) {
  const resolvedPrompt = resolveTemplate(node.config.systemPrompt, context);

  const previousOutputs = Object.entries(context.nodeOutputs);
  let userPrompt = 'Execute.';

  if (previousOutputs.length > 0) {
    const parts = previousOutputs.map(([nodeId, output]) => {
      let text: string;
      if (typeof output === 'string') {
        text = output;
      } else if (typeof output === 'object' && output !== null) {
        const object = output as Record<string, unknown>;
        text =
          typeof object['response'] === 'string'
            ? object['response']
            : typeof object['input'] === 'string'
              ? object['input']
              : JSON.stringify(output);
      } else {
        text = JSON.stringify(output);
      }
      return `[${nodeId}]:\n${text}`;
    });
    userPrompt = `Here is the context from previous steps:\n\n${parts.join('\n\n')}`;
  }

  const webSearchEnabled = node.config.webSearch === true && Boolean(deps.tavilyApiKey);
  const tools = webSearchEnabled ? { webSearch: createWebSearchTool(deps.tavilyApiKey!) } : undefined;

  const call = {
    model: deps.model,
    // Temporal's activity retry policy owns retries; SDK retries on top would
    // multiply model calls (up to 3x per activity attempt).
    maxRetries: 0,
    system: resolvedPrompt,
    prompt: userPrompt,
    // The AI SDK runs the tool call/execute/continue loop internally up to this many steps.
    ...(tools ? { tools, stopWhen: stepCountIs(MAX_TOOL_STEPS) } : {}),
  };

  try {
    const { outputSchema } = node.config;
    if (outputSchema == null) {
      const result = await generateText(call);
      return { output: { response: result.text } };
    }

    // The schema goes to the provider as-is: its shape is the author's, the provider enforces it.
    const result = await generateText({ ...call, output: Output.object({ schema: jsonSchema(outputSchema) }) });
    // The SDK parses only a `stop` finish; otherwise it throws `No output generated.` without the reason.
    // Unclassified on purpose, so it keeps the node profile's uniform retry.
    if (result.finishReason !== 'stop') {
      throw new NodeExecutionError(
        'structured_output_incomplete',
        `The model stopped before a structured answer (finish reason: ${result.finishReason})`,
      );
    }
    return { output: result.output };
  } catch (error) {
    const failure = classifyProviderError(error);
    // executionId joins this line to its node_failed event.
    const message = error instanceof Error ? error.message : String(error);
    deps.logger?.error('llm call failed', {
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: node.id,
      error: { message, ...(failure instanceof NodeExecutionError ? { code: failure.code } : {}) },
    });
    throw failure;
  }
}
