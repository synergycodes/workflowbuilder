import type { WorkflowDefinition, WorkflowEnginePort } from '@workflowbuilder/temporal';
import { randomUUID } from 'node:crypto';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';

import type { RunEvent, RunRequest, RunResponse } from '../../shared/protocol';
import { WORKFLOW_ID, temporalUiUrl } from './config';
import type { SampleNode } from './nodes';
import type { RunStore } from './store';
import { snapshotToDefinition } from './to-definition';

export type BridgeOptions = {
  engine: WorkflowEnginePort<SampleNode>;
  store: RunStore;
  port: number;
};

const EVENTS_PATH = /^\/api\/runs\/([^/]+)\/events$/;

export function startBridge({ engine, store, port }: BridgeOptions): Server {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    try {
      if (request.method === 'POST' && path === '/api/runs') {
        await startRun(request, response, engine);
        return;
      }
      const events = EVENTS_PATH.exec(path);
      if (request.method === 'GET' && events) {
        streamEvents(response, store, events[1]);
        return;
      }
      sendJson(response, 404, { message: `No route for ${request.method} ${path}` });
    } catch (error) {
      const status = error instanceof BadRequestError ? 400 : 502;
      sendJson(response, status, { message: error instanceof Error ? error.message : String(error) });
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    const bound = typeof address === 'object' && address ? address.port : port;
    console.log(`bridge listening on http://127.0.0.1:${bound}`);
  });
  return server;
}

// An open event stream keeps `close()` waiting forever, so drop every connection first.
export function closeBridge(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}

class BadRequestError extends Error {}

async function startRun(
  request: IncomingMessage,
  response: ServerResponse,
  engine: WorkflowEnginePort<SampleNode>,
): Promise<void> {
  const raw = await readBody(request);
  let body: Partial<RunRequest>;
  let definition: WorkflowDefinition<SampleNode>;
  try {
    body = JSON.parse(raw) as Partial<RunRequest>;
    if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
      throw new TypeError('The body must be a diagram snapshot: { nodes: [], edges: [], triggerPayload?: {} }.');
    }
    definition = snapshotToDefinition({ nodes: body.nodes, edges: body.edges }, WORKFLOW_ID);
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }

  const executionId = randomUUID();
  await engine.submit({
    workflowId: WORKFLOW_ID,
    executionId,
    definition,
    triggerPayload: body.triggerPayload ?? {},
    variables: {},
    global: {},
  });

  const payload: RunResponse = { executionId, temporalUiUrl: temporalUiUrl(executionId) };
  sendJson(response, 201, payload);
}

function streamEvents(response: ServerResponse, store: RunStore, executionId: string): void {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event: RunEvent) => response.write(`data: ${JSON.stringify(event)}\n\n`);

  // Replay first: the browser subscribes after the run has started, so the first events are
  // already in the store's history.
  for (const event of store.history(executionId)) send(event);
  const unsubscribe = store.subscribe(executionId, send);
  response.on('close', unsubscribe);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}
