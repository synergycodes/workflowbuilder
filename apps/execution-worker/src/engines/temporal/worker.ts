import { NativeConnection, Worker } from '@temporalio/worker';
import { WorkflowBuilderPlugin } from '@workflowbuilder/temporal';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';

import { executeAgentHarness } from '../../activities/agent-harness';
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

const aiAgentLogger = logger.child({ component: 'ai-agent' });
const agentHarnessLogger = logger.child({ component: 'agent-harness' });

// Env-sourced credential (A5): no vault/credential-store lookup exists yet, so the
// worker builds the one credential it can from its own env, the same way `provider.ts`'s
// ambient-auth fallback already tolerates an absent token (falls back to `copilot login`).
const agentHarnessCredential = env.COPILOT_GITHUB_TOKEN
  ? ({ kind: 'api_key', apiKey: env.COPILOT_GITHUB_TOKEN } as const)
  : undefined;

// The plugin contributes the three activities that execute a graph. What each node
// type actually does stays here, and so does where events are persisted.
const plugin = new WorkflowBuilderPlugin<AiStudioNode>({
  executors: {
    'ai-studio/trigger': executeTrigger,
    'ai-studio/decision': executeDecision,
    'ai-studio/ai-agent': (node, context) =>
      executeAiAgent(node, context, {
        openrouter,
        defaultModel: env.AI_MODEL,
        logger: aiAgentLogger,
        tavilyApiKey: env.TAVILY_API_KEY,
      }),
    'ai-studio/visualize': executeVisualize,
    'ai-studio/agent-harness': (node, context) =>
      executeAgentHarness(node, context, {
        logger: agentHarnessLogger,
        credential: agentHarnessCredential,
      }),
  },
  store: withPayloadSizeWarning(database, logger),
  nodeActivityProfiles: {
    'ai-studio/agent-harness': {
      startToCloseTimeout: '45m',
      retry: { maximumAttempts: 1 }, // zero automatic retries — side-effecting node
      heartbeatTimeout: '5s',
    },
  },
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
