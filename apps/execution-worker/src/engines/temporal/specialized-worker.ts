// Activity-only worker: polls SPECIALIZED_TASK_QUEUE and registers just the node
// type(s) routed there via a profile's `taskQueue`. No `workflowsPath` — Temporal
// supports activity-only workers, so this process never needs the workflow bundle.
// Runs from its own Docker image so its tools stay off the general worker's image.
import { NativeConnection, Worker } from '@temporalio/worker';
import { WorkflowBuilderPlugin } from '@workflowbuilder/temporal';
import 'dotenv/config';

import { executeAiAgent } from '../../activities/ai-agent';
import { database } from '../../database';
import type { AiAgentNode } from '../../domain/ai-studio-nodes';
import { env } from '../../env';
import { logger } from '../../logger';
import { withPayloadSizeWarning } from '../../store-payload-warning';

const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');

const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
const model = openrouter.chat(env.AI_MODEL);

const aiAgentLogger = logger.child({ component: 'ai-agent', worker: 'specialized' });

// Illustrative: the AI agent is the reference example of a node type heavy enough to
// want its own image (a coding-agent CLI, GPU tooling, ...). Swap in whichever
// executor(s) a real deployment routes to this queue via nodeActivityProfiles.
const plugin = new WorkflowBuilderPlugin<AiAgentNode>({
  executors: {
    'ai-studio/ai-agent': (node, context) =>
      executeAiAgent(node, context, { model, logger: aiAgentLogger, tavilyApiKey: env.TAVILY_API_KEY }),
  },
  store: withPayloadSizeWarning(database, logger),
  taskQueue: env.SPECIALIZED_TASK_QUEUE,
});

const connection = await NativeConnection.connect({ address: env.TEMPORAL_ADDRESS });

const worker = await Worker.create({
  connection,
  taskQueue: plugin.taskQueue,
  plugins: [plugin],
});

logger.info('specialized execution worker started', { taskQueue: plugin.taskQueue });
await worker.run();
