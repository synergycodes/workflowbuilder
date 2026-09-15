import type { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

export type OpenRouterClient = ReturnType<typeof createOpenRouter>;

type KnownProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'mistral'
  | 'cohere'
  | 'deepseek'
  | 'moonshotai'
  | 'groq'
  | 'togetherai'
  | 'fireworks'
  | 'perplexity'
  | 'cerebras'
  | 'deepinfra';

type ProviderTableEntry = {
  envVar: string;
  // matches OpenRouter's own model-id namespacing for that vendor
  prefix: string;
  load: (modelId: string) => Promise<LanguageModel>;
};

// Every provider package is dynamically imported only on the branch that
// needs it, so a deployment using only OpenRouter never pulls in the rest.
const PROVIDER_TABLE: Record<KnownProvider, ProviderTableEntry> = {
  openai: {
    envVar: 'OPENAI_API_KEY',
    prefix: 'openai/',
    load: async (id) => {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI()(id);
    },
  },
  anthropic: {
    envVar: 'ANTHROPIC_API_KEY',
    prefix: 'anthropic/',
    load: async (id) => {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      return createAnthropic()(id);
    },
  },
  google: {
    envVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    prefix: 'google/',
    load: async (id) => {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      return createGoogleGenerativeAI()(id);
    },
  },
  xai: {
    envVar: 'XAI_API_KEY',
    prefix: 'xai/',
    load: async (id) => {
      const { createXai } = await import('@ai-sdk/xai');
      return createXai()(id);
    },
  },
  mistral: {
    envVar: 'MISTRAL_API_KEY',
    prefix: 'mistral/',
    load: async (id) => {
      const { createMistral } = await import('@ai-sdk/mistral');
      return createMistral()(id);
    },
  },
  cohere: {
    envVar: 'COHERE_API_KEY',
    prefix: 'cohere/',
    load: async (id) => {
      const { createCohere } = await import('@ai-sdk/cohere');
      return createCohere()(id);
    },
  },
  deepseek: {
    envVar: 'DEEPSEEK_API_KEY',
    prefix: 'deepseek/',
    load: async (id) => {
      const { createDeepSeek } = await import('@ai-sdk/deepseek');
      return createDeepSeek()(id);
    },
  },
  moonshotai: {
    envVar: 'MOONSHOT_API_KEY',
    prefix: 'moonshotai/',
    load: async (id) => {
      const { createMoonshotAI } = await import('@ai-sdk/moonshotai');
      return createMoonshotAI()(id);
    },
  },
  groq: {
    envVar: 'GROQ_API_KEY',
    prefix: 'groq/',
    load: async (id) => {
      const { createGroq } = await import('@ai-sdk/groq');
      return createGroq()(id);
    },
  },
  togetherai: {
    envVar: 'TOGETHER_API_KEY',
    prefix: 'togetherai/',
    load: async (id) => {
      const { createTogetherAI } = await import('@ai-sdk/togetherai');
      return createTogetherAI()(id);
    },
  },
  fireworks: {
    envVar: 'FIREWORKS_API_KEY',
    prefix: 'fireworks/',
    load: async (id) => {
      const { createFireworks } = await import('@ai-sdk/fireworks');
      return createFireworks()(id);
    },
  },
  perplexity: {
    envVar: 'PERPLEXITY_API_KEY',
    prefix: 'perplexity/',
    load: async (id) => {
      const { createPerplexity } = await import('@ai-sdk/perplexity');
      return createPerplexity()(id);
    },
  },
  cerebras: {
    envVar: 'CEREBRAS_API_KEY',
    prefix: 'cerebras/',
    load: async (id) => {
      const { createCerebras } = await import('@ai-sdk/cerebras');
      return createCerebras()(id);
    },
  },
  deepinfra: {
    envVar: 'DEEPINFRA_API_KEY',
    prefix: 'deepinfra/',
    load: async (id) => {
      const { createDeepInfra } = await import('@ai-sdk/deepinfra');
      return createDeepInfra()(id);
    },
  },
};

function isKnownProvider(value: string): value is KnownProvider {
  return Object.hasOwn(PROVIDER_TABLE, value);
}

// OpenRouter serves nearly all the same underlying models under one key, so it's
// the catch-all when no direct-provider prefix/key combination matches.
function inferAutoProvider(modelId: string): KnownProvider | 'openrouter' {
  for (const [id, entry] of Object.entries(PROVIDER_TABLE) as [KnownProvider, ProviderTableEntry][]) {
    if (modelId.startsWith(entry.prefix) && process.env[entry.envVar]) return id;
  }
  return 'openrouter';
}

function stripPrefix(modelId: string, prefix: string): string {
  return modelId.startsWith(prefix) ? modelId.slice(prefix.length) : modelId;
}

/**
 * Resolves a node's `model`/`provider` config into a concrete `LanguageModel`.
 * `'auto'` infers the provider from the model-id prefix when the matching API
 * key is present, otherwise falls back to `openrouter`. Any other value is
 * looked up in the provider table; a free-text value with no table entry
 * fails loudly rather than silently falling back — the same for a known
 * provider whose API key env var is unset.
 */
export async function resolveModel(
  modelId: string,
  provider: string,
  openrouter: OpenRouterClient,
): Promise<LanguageModel> {
  const resolved = provider === 'auto' ? inferAutoProvider(modelId) : provider;

  if (resolved === 'openrouter') return openrouter.chat(modelId);

  if (!isKnownProvider(resolved)) {
    throw new Error(`Unknown provider "${provider}" — no client registered for it yet`);
  }

  const entry = PROVIDER_TABLE[resolved];
  if (!process.env[entry.envVar]) {
    throw new Error(`provider: '${resolved}' requires ${entry.envVar} to be set`);
  }
  return entry.load(stripPrefix(modelId, entry.prefix));
}
