import { NativeConnection, Worker } from '@temporalio/worker';
import { WorkflowBuilderPlugin } from '@workflowbuilder/temporal';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';

import { database } from '../../database';
import type { AiStudioNode } from '../../domain/ai-studio-nodes';
import { env } from '../../env';
import { createAiAgentExecutor } from '../../executors/ai-agent';
import { executeDecision } from '../../executors/decision';
import { executeTrigger } from '../../executors/trigger';
import { executeVisualize } from '../../executors/visualize';
import { logger } from '../../logger';
import { withPayloadSizeWarning } from '../../store-payload-warning';

if (!env.AI_API_KEY) {
  logger.warn('no LLM key configured — AI Agent nodes will fail; every other node type runs as usual');
}

const executeAIAgent = createAiAgentExecutor({
  apiKey: env.AI_API_KEY,
  baseURL: env.AI_BASE_URL,
  modelId: env.AI_MODEL,
  logger: logger.child({ component: 'ai-agent' }),
  tavilyApiKey: env.TAVILY_API_KEY,
});

// The plugin contributes the three activities that execute a graph. What each node
// type actually does stays here, and so does where events are persisted.
const plugin = new WorkflowBuilderPlugin<AiStudioNode>({
  executors: {
    'ai-studio/trigger': executeTrigger,
    'ai-studio/decision': executeDecision,
    'ai-studio/ai-agent': executeAIAgent,
    'ai-studio/visualize': executeVisualize,
  },
  store: withPayloadSizeWarning(database, logger),
});

// without an explicit connection, Worker.create dials 127.0.0.1:7233 and ignores TEMPORAL_ADDRESS
const connection = await NativeConnection.connect({ address: env.TEMPORAL_ADDRESS });

const worker = await Worker.create({
  connection,
  taskQueue: plugin.taskQueue,
  workflowsPath: fileURLToPath(new URL('workflows.ts', import.meta.url)),
  plugins: [plugin],
});

logger.info('execution worker started', { taskQueue: plugin.taskQueue });
await worker.run();
