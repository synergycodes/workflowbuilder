import type { JSONSchema7 } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiConfig } from '@workflow-builder/ai-config';
import {
  type ExecutionContext,
  NodeExecutionError,
  PermanentNodeExecutionError,
  classifyNodeError,
} from '@workflow-builder/execution-core';

import type { AiAgentNode } from '../domain/ai-studio-nodes';
import { createAiAgentExecutor } from './ai-agent';

function context(): ExecutionContext {
  return {
    workflowId: 'wf',
    executionId: 'exec',
    triggerPayload: {},
    nodeOutputs: {},
    variables: {},
    global: {},
  };
}

const node: AiAgentNode = {
  id: 'a1',
  type: 'ai-studio/ai-agent',
  config: { systemPrompt: 'Summarise the input.' },
};

const endpoint = { AI_BASE_URL: 'https://openrouter.ai/api/v1', AI_MODEL: 'some/model' };

function stubEndpoint(content: string) {
  const bodies: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', async (_url: unknown, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return Response.json({
      id: 'chat',
      object: 'chat.completion',
      created: 0,
      model: 'some/model',
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  });
  return bodies;
}

describe('createAiAgentExecutor without a key', () => {
  const executor = createAiAgentExecutor({ ai: aiConfig(endpoint) });

  it('fails the node instead of the worker boot', () => {
    // The factory itself must not throw — that is what lets the worker start and
    // keep serving Trigger/Decision/Visualize nodes.
    expect(() => executor(node, context())).toThrow(NodeExecutionError);
  });

  it('reports a code the UI can key off, and names the variable to set', () => {
    try {
      executor(node, context());
      expect.unreachable('executor should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NodeExecutionError);
      expect((error as NodeExecutionError).code).toBe('ai_not_configured');
      expect((error as NodeExecutionError).message).toContain('AI_API_KEY');
    }
  });

  it('is permanent, so the engine adapter stops after one attempt', () => {
    try {
      executor(node, context());
      expect.unreachable('executor should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PermanentNodeExecutionError);
      expect(classifyNodeError(error)).toBe('permanent');
    }
  });
});

describe('createAiAgentExecutor with a key', () => {
  it('builds the executor without calling the endpoint', () => {
    // Construction is eager (the model is built once per worker), so it has to
    // stay free of network I/O — the endpoint may not even be reachable at boot.
    const executor = createAiAgentExecutor({ ai: aiConfig({ ...endpoint, AI_API_KEY: 'test-key' }) });

    expect(executor).toBeTypeOf('function');
  });
});

describe('createAiAgentExecutor against the endpoint', () => {
  afterEach(() => vi.unstubAllGlobals());

  const executor = createAiAgentExecutor({ ai: aiConfig({ ...endpoint, AI_API_KEY: 'test-key' }) });

  // Without supportsStructuredOutputs the provider sends json_object and drops the schema, and the node still resolves.
  it('asks for a strict json_schema response carrying the node schema', async () => {
    const bodies = stubEndpoint('{"refundAmount":49}');
    const outputSchema: JSONSchema7 = {
      type: 'object',
      properties: { refundAmount: { type: 'number' } },
      required: ['refundAmount'],
      additionalProperties: false,
    };

    const result = await executor({ ...node, config: { ...node.config, outputSchema } }, context());

    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.['response_format']).toEqual({
      type: 'json_schema',
      json_schema: { name: 'response', strict: true, schema: outputSchema },
    });
    expect(result).toEqual({ output: { refundAmount: 49 } });
  });

  // The flag is set once per worker, so it must not reach nodes that answer in text.
  it('asks for no response format when the node has no output schema', async () => {
    const bodies = stubEndpoint('A short summary.');

    const result = await executor(node, context());

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toHaveProperty('response_format');
    expect(result).toEqual({ output: { response: 'A short summary.' } });
  });
});

describe('createAiAgentExecutor with a key but no endpoint or model', () => {
  // Neither has a built-in default, so they gate the node exactly like the key does.
  it('fails the node with the same code and names only the missing variables', () => {
    const executor = createAiAgentExecutor({ ai: aiConfig({ AI_API_KEY: 'key' }) });

    try {
      executor(node, context());
      expect.unreachable('executor should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NodeExecutionError);
      expect((error as NodeExecutionError).code).toBe('ai_not_configured');
      expect((error as NodeExecutionError).message).toContain('AI_BASE_URL');
      expect((error as NodeExecutionError).message).toContain('AI_MODEL');
      expect((error as NodeExecutionError).message).not.toContain('AI_API_KEY');
    }
  });
});
