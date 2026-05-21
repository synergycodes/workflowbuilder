import { createConsoleLogger } from '@workflow-builder/execution-core';

// Single backend logger. Pretty-prints in non-production so a developer
// tailing the terminal sees readable lines; in production it emits one
// JSON object per call for a structured sink to ingest.
export const logger = createConsoleLogger(
  { component: 'backend' },
  { pretty: process.env['NODE_ENV'] !== 'production' },
);
