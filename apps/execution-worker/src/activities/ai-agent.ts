import { generateText, stepCountIs } from 'ai';

import { type ExecutionContext, type LoggerPort, resolveTemplate } from '@workflow-builder/execution-core';

import type { AiAgentNode } from '../domain/ai-studio-nodes';
import { createWebSearchTool } from '../tools/web-search';

// Cap on the agentic tool loop: enough for a search → synthesize round-trip
// (and a retry), bounded so a misbehaving model can't run up cost.
const MAX_TOOL_STEPS = 4;

type AiAgentDeps = {
  model: Parameters<typeof generateText>[0]['model'];
  logger?: LoggerPort;
  // Optional. When present and the node opts in, the agent gets a web-search tool.
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

  // Expose the web-search tool only when the node opted in AND a key is set.
  // Without it the agent still runs — it just answers without searching.
  const webSearchEnabled = node.config.webSearch === true && Boolean(deps.tavilyApiKey);
  const tools = webSearchEnabled ? { webSearch: createWebSearchTool(deps.tavilyApiKey!) } : undefined;

  try {
    const result = await generateText({
      model: deps.model,
      system: resolvedPrompt,
      prompt: userPrompt,
      // The AI SDK runs the tool call/execute/continue loop internally up to
      // this many steps; no effect when `tools` is undefined.
      ...(tools ? { tools, stopWhen: stepCountIs(MAX_TOOL_STEPS) } : {}),
    });

    return { output: { response: result.text } };
  } catch (error) {
    // Mirror the `node_failed` event payload shape (`{ error: { message, code? } }`)
    // so operators correlating a log line with the SSE event by executionId see
    // the same structure on both sides.
    const message = error instanceof Error ? error.message : String(error);
    deps.logger?.error('llm call failed', {
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: node.id,
      error: { message },
    });
    throw error;
  }
}
