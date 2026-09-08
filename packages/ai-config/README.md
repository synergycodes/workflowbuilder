# @workflow-builder/ai-config

Private, source-only. The one place that says what "AI is configured" means for the reference backend and execution worker.

## The contract

Three variables, all or nothing:

| Variable      | Meaning                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `AI_API_KEY`  | Key for the endpoint. OpenRouter keys look like `sk-or-v1-...`                                                               |
| `AI_BASE_URL` | Any OpenAI-compatible base URL (a hosted gateway or a model inside your own network), without a trailing `/chat/completions` |
| `AI_MODEL`    | Model id as that endpoint spells it                                                                                          |

- None has a built-in default — nothing in the code points outside your network. Both `.env.example` files pre-fill the OpenRouter values the stack used before the endpoint became configurable.
- An empty value counts as unset (compose passes absent optionals through as `${VAR:-}`).
- `OPENROUTER_API_KEY`, the old name of the key, is not read.

```ts
import { aiConfig } from '@workflow-builder/ai-config';

const ai = aiConfig(); // reads process.env when called; never throws
// { available: true, config: { apiKey, baseURL, modelId } }
// { available: false, missing: ['AI_BASE_URL', 'AI_MODEL'] }
```

`TAVILY_API_KEY` is not part of this contract. It is a worker-only, independently optional key that enables the AI Agent's web-search tool on nodes that ask for it — see [`apps/execution-worker/README.md`](../../apps/execution-worker/README.md).

## What happens when it is unavailable

Deliberately not decided here. Each app reacts in its own way so that a missing model never blocks graphs without AI:

- **Backend** — `POST /api/visualize/adapt` answers `501 adapt_disabled`, after authorization and the execution guard have run (`apps/backend/src/routes/visualize.ts`).
- **Worker** — boots, logs a warning naming the missing variables, and runs every node type. An AI Agent node that a run reaches fails with the permanent `ai_not_configured` code and the same names (`apps/execution-worker/src/executors/ai-agent.ts`).

Logging, provider lifetime and retries also stay in the apps. Sharing the parser keeps the two readings of the rule identical; it cannot make two independently configured processes agree on the values — set the variables in both `.env` files.
