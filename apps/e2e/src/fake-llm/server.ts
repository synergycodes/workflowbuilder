import http from 'node:http';

import { valueFromSchema } from './value-from-schema';

export const FAKE_TEXT_REPLY = 'This is the fake LLM reply.';
export const REQUESTS_ROUTE = '/__e2e/requests';

export type RecordedRequest = { receivedAt: string; body: unknown };

type FakeLlm = { close: () => Promise<void> };

const DELAY_DIRECTIVE = /e2e:delay=(\d+)/;

function readBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function sendJson(response: http.ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function jsonSchemaOf(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('response_format' in body)) {
    return undefined;
  }
  const format = body.response_format as { type?: unknown; json_schema?: { schema?: unknown } } | null;
  return format?.type === 'json_schema' ? format.json_schema?.schema : undefined;
}

function completion(body: unknown) {
  const schema = jsonSchemaOf(body);
  const content = schema === undefined ? FAKE_TEXT_REPLY : JSON.stringify(valueFromSchema(schema));
  const model = (body as { model?: unknown }).model;
  return {
    id: 'chatcmpl-fake',
    object: 'chat.completion',
    created: 0,
    model: typeof model === 'string' ? model : 'fake',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

export function startFakeLlm(port: number): Promise<FakeLlm> {
  const recorded: { raw: string; request: RecordedRequest }[] = [];

  async function complete(request: http.IncomingMessage, response: http.ServerResponse) {
    const raw = await readBody(request);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      sendJson(response, 400, { error: { message: 'The fake LLM got a body that is not JSON.' } });
      return;
    }
    recorded.push({ raw, request: { receivedAt: new Date().toISOString(), body } });

    if (typeof body !== 'object' || body === null || (body as { stream?: unknown }).stream === true) {
      sendJson(response, 400, { error: { message: 'The fake LLM answers non-streaming chat completions only.' } });
      return;
    }

    const delayMs = Number(DELAY_DIRECTIVE.exec(raw)?.[1] ?? 0);
    if (delayMs === 0) {
      sendJson(response, 200, completion(body));
      return;
    }
    const timer = setTimeout(() => sendJson(response, 200, completion(body)), delayMs);
    response.on('close', () => clearTimeout(timer));
  }

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake-llm');
    if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
      complete(request, response).catch((error: unknown) => {
        sendJson(response, 500, { error: { message: String(error) } });
      });
      return;
    }
    if (request.method === 'GET' && url.pathname === REQUESTS_ROUTE) {
      const marker = url.searchParams.get('marker');
      if (!marker) {
        sendJson(response, 400, { error: { message: 'Pass ?marker=<text found in the request body>.' } });
        return;
      }
      sendJson(
        response,
        200,
        recorded.filter(({ raw }) => raw.includes(marker)).map(({ request: entry }) => entry),
      );
      return;
    }
    sendJson(response, 404, { error: { message: `The fake LLM has no route ${request.method} ${url.pathname}.` } });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        close: () =>
          new Promise((done) => {
            server.close(() => done());
            server.closeAllConnections();
          }),
      });
    });
  });
}
