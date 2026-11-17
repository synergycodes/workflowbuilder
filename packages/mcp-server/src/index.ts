#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildCorpus } from './corpus/build-corpus.js';
import { PACKAGE_ROOT } from './paths.js';
import { createMcpServer, createToolRegistry } from './server.js';

async function main() {
  const { version } = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as {
    version: string;
  };
  const corpus = await buildCorpus();
  const { pages, chunks, symbols, members, typedocBuiltAt, gitHead, versions, buildMs } = corpus.stats;
  const documented = Object.entries(versions).map(([name, packageVersion]) => `${name} ${packageVersion}`);
  console.error(
    `wb-docs ${version} ready: ${pages} pages, ${chunks} chunks, ${symbols} symbols (${members} members), documents ${documented.join(', ') || 'unknown versions'}, data built ${typedocBuiltAt} at ${gitHead}, indexed in ${buildMs} ms`,
  );

  const server = createMcpServer(createToolRegistry(corpus), version);
  await server.connect(new StdioServerTransport());

  const shutdown = () => {
    void server.close().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`wb-docs failed to start: ${message}`);
  process.exit(1);
}
