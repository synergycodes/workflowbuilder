import { NativeConnection, Worker } from '@temporalio/worker';
import { WorkflowBuilderPlugin } from '@workflowbuilder/temporal';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';

import { executeAiAgent } from '../../activities/ai-agent';
import { database } from '../../database';
import type { AiStudioNode } from '../../domain/ai-studio-nodes';
import { env } from '../../env';
import { executeDecision } from '../../executors/decision';
import { executeTrigger } from '../../executors/trigger';
import { executeVisualize } from '../../executors/visualize';
import { logger } from '../../logger';
import { withPayloadSizeWarning } from '../../store-payload-warning';

const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');

const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
const model = openrouter.chat(env.AI_MODEL);

const aiAgentLogger = logger.child({ component: 'ai-agent' });

// The plugin contributes the three activities that execute a graph. What each node
// type actually does stays here, and so does where events are persisted.
const plugin = new WorkflowBuilderPlugin<AiStudioNode>({
  executors: {
    'ai-studio/trigger': executeTrigger,
    'ai-studio/decision': executeDecision,
    'ai-studio/ai-agent': (node, context) =>
      executeAiAgent(node, context, { model, logger: aiAgentLogger, tavilyApiKey: env.TAVILY_API_KEY }),
    'ai-studio/visualize': executeVisualize,
  },
  store: withPayloadSizeWarning(database, logger),
  logger,
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
