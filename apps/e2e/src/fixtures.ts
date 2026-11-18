import { type Page, test as base } from '@playwright/test';
import { randomUUID } from 'node:crypto';

import { REQUESTS_ROUTE, type RecordedRequest } from './fake-llm/server';
import { settings } from './stack/settings';

export type LlmRequest = {
  system: string;
  user: string;
  /** The JSON schema of a structured request; undefined for a text request. */
  schema: unknown;
  body: unknown;
};

type StoredExecution = { id: string; status: string; outcome: string | null };

type Fixtures = {
  /** Unique per test. Put it in the trigger input: it reaches the model, so the fake LLM can tell this test's requests apart. */
  marker: string;
  /** AI Studio, opened on the editor with the welcome dialog acknowledged and no stored draft. */
  studio: Page;
  llm: { requests: () => Promise<LlmRequest[]> };
  backend: { execution: (executionId: string) => Promise<StoredExecution> };
};

type ChatMessage = { role?: string; content?: string | { type?: string; text?: string }[] };

function textOf(messages: ChatMessage[], role: string): string {
  return messages
    .filter((message) => message.role === role)
    .map(({ content }) =>
      typeof content === 'string' ? content : (content ?? []).map((part) => part.text ?? '').join(''),
    )
    .join('\n');
}

function toLlmRequest({ body }: RecordedRequest): LlmRequest {
  const { messages = [], response_format: format } = body as {
    messages?: ChatMessage[];
    response_format?: { json_schema?: { schema?: unknown } };
  };
  return {
    system: textOf(messages, 'system'),
    user: textOf(messages, 'user'),
    schema: format?.json_schema?.schema,
    body,
  };
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  marker: async ({}, use) => {
    await use(`e2e-${randomUUID().slice(0, 8)}`);
  },

  studio: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('ai-studio:disclaimer-acknowledged-v2', 'true');
    });
    await page.goto('/');
    await use(page);
  },

  llm: async ({ marker, request }, use) => {
    await use({
      async requests() {
        const response = await request.get(`${settings.fakeLlmUrl}${REQUESTS_ROUTE}`, { params: { marker } });
        const recorded = (await response.json()) as RecordedRequest[];
        return recorded.map((entry) => toLlmRequest(entry));
      },
    });
  },

  backend: async ({ request }, use) => {
    await use({
      async execution(executionId) {
        const response = await request.get(`${settings.backendUrl}/api/executions/${executionId}`);
        return (await response.json()) as StoredExecution;
      },
    });
  },
});

export { expect } from '@playwright/test';
