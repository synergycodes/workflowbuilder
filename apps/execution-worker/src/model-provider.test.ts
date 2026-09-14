import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveModel } from './model-provider';

function fakeOpenrouter() {
  return { chat: vi.fn((id: string) => ({ modelId: id, kind: 'openrouter' })) } as unknown as Parameters<
    typeof resolveModel
  >[2];
}

describe('resolveModel', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.endsWith('_API_KEY')) delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to openrouter under 'auto' when no matching provider key is present", async () => {
    const openrouter = fakeOpenrouter();

    const model = await resolveModel('mistralai/mistral-small', 'auto', openrouter);

    expect(openrouter.chat).toHaveBeenCalledWith('mistralai/mistral-small');
    expect(model).toEqual({ modelId: 'mistralai/mistral-small', kind: 'openrouter' });
  });

  it("resolves an unprefixed model id under 'auto' to openrouter", async () => {
    const openrouter = fakeOpenrouter();

    await resolveModel('some-custom-model', 'auto', openrouter);

    expect(openrouter.chat).toHaveBeenCalledWith('some-custom-model');
  });

  it("infers the direct provider under 'auto' when its prefix matches and its key is present", async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    const openrouter = fakeOpenrouter();

    const model = await resolveModel('openai/gpt-4o-mini', 'auto', openrouter);

    expect(openrouter.chat).not.toHaveBeenCalled();
    expect(model).toBeDefined();
  });

  it('routes to openrouter when explicitly selected', async () => {
    const openrouter = fakeOpenrouter();

    await resolveModel('anthropic/claude-3-haiku', 'openrouter', openrouter);

    expect(openrouter.chat).toHaveBeenCalledWith('anthropic/claude-3-haiku');
  });

  it('throws when an explicit known provider is selected but its API key env var is missing', async () => {
    const openrouter = fakeOpenrouter();

    await expect(resolveModel('gpt-4o-mini', 'openai', openrouter)).rejects.toThrow('OPENAI_API_KEY');
  });

  it('resolves an explicit known provider when its API key env var is present', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    const openrouter = fakeOpenrouter();

    const model = await resolveModel('claude-3-haiku', 'anthropic', openrouter);

    expect(model).toBeDefined();
  });

  it('throws clearly for an unknown free-text provider', async () => {
    const openrouter = fakeOpenrouter();

    await expect(resolveModel('some-model', 'not-a-real-provider', openrouter)).rejects.toThrow(
      'Unknown provider "not-a-real-provider"',
    );
  });
});
