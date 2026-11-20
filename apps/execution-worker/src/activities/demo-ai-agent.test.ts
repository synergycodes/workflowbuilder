import { describe, expect, it, vi } from 'vitest';

import type { ExecutionContext } from '@workflow-builder/execution-core';
import type { DemoAiAgentNode } from '@workflow-builder/types/workflow-execution/demo-execution';

import { classifyOpenRouterError, executeDemoAiAgent } from './demo-ai-agent';

const node: DemoAiAgentNode = {
  id: 'ai',
  type: 'ai-agent',
  config: { systemPrompt: 'You are helpful to {{trigger.name}}.' },
};

const context: ExecutionContext = {
  workflowId: 'workflow',
  executionId: 'execution',
  triggerPayload: { name: 'Alice' },
  nodeOutputs: { action: { status: 'success' } },
  variables: {},
  global: {},
};

describe('executeDemoAiAgent', () => {
  it('fails only the AI node when the optional key is absent and never creates a provider', async () => {
    const createModel = vi.fn();
    const generate = vi.fn();

    await expect(executeDemoAiAgent(node, context, { modelId: 'model', createModel, generate })).rejects.toMatchObject({
      code: 'ai_provider_not_configured',
      message: expect.not.stringContaining('sk-'),
    });
    expect(createModel).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns text, token usage, and provider model id', async () => {
    const model = { modelId: 'configured' } as never;
    const generate = vi.fn().mockResolvedValue({
      text: 'Result',
      totalUsage: { totalTokens: 42 },
      response: { modelId: 'resolved-model' },
    });

    await expect(
      executeDemoAiAgent(node, context, {
        apiKey: 'secret-key',
        modelId: 'configured-model',
        createModel: vi.fn().mockResolvedValue(model),
        generate: generate as never,
      }),
    ).resolves.toEqual({ output: { response: 'Result', tokensUsed: 42, model: 'resolved-model' } });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model,
        system: 'You are helpful to Alice.',
        prompt: expect.stringContaining('[action]'),
      }),
    );
  });

  it.each([
    [401, 'ai_provider_auth_failed'],
    [403, 'ai_provider_auth_failed'],
    [429, 'ai_provider_request_failed'],
    [503, 'ai_provider_request_failed'],
    [400, 'ai_provider_request_failed'],
  ])('sanitizes provider status %s as %s', (status, code) => {
    const classified = classifyOpenRouterError(
      new Error(`provider leaked sk-secret and status ${status}`, { cause: { status } }),
    );
    expect(classified.code).toBe(code);
    expect(classified.message).not.toContain('sk-secret');
  });
});
