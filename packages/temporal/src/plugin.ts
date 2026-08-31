import { SimplePlugin } from '@temporalio/plugin';

import { type CreateActivitiesOptions, createActivities } from './activities';
import { DEFAULT_TASK_QUEUE } from './constants';
import type { BaseNode } from './core-contract';

export type WorkflowBuilderPluginOptions<TNode extends BaseNode> = CreateActivitiesOptions<TNode> & {
  // Defaults to DEFAULT_TASK_QUEUE. Read it back off the plugin (`plugin.taskQueue`)
  // when creating the Worker so the queue is named in exactly one place.
  taskQueue?: string;
};

// Temporal's Technical Review Standards ask for `my_library.MyPlugin`, and every
// example in their plugins guide passes `organization.PluginName`. Their own shipped
// plugins disagree: @temporalio/interceptors-opentelemetry registers
// 'OpenTelemetryPlugin' and @temporalio/ai-sdk registers 'AiSDKPlugin', both bare
// class names. The dotted form satisfies the written standard and the docs at once,
// so it is the safer pick — do not "simplify" it back to the class name.
//
// This string is what users see in worker logs; it is not the npm package name.
const PLUGIN_NAME = 'workflowbuilder.WorkflowBuilderPlugin';

// Registers the activities that execute a Workflow Builder graph on Temporal.
//
// What it deliberately does NOT do:
//   - bundle the workflow. The TypeScript SDK builds the workflow bundle from a
//     single module, so setting `workflowsPath` here would take that slot away from
//     the consumer. They re-export `runWorkflow` from their own workflows file
//     instead — the same pattern Temporal's own AI SDK plugin uses.
//   - open the connection. Connection, TLS and credentials stay with the consumer.
//   - own storage. Persistence arrives as the `store` port.
export class WorkflowBuilderPlugin<TNode extends BaseNode = BaseNode> extends SimplePlugin {
  // The queue this plugin's activities are meant to be served on.
  readonly taskQueue: string;

  constructor(options: WorkflowBuilderPluginOptions<TNode>) {
    super({
      name: PLUGIN_NAME,
      // SimplePlugin appends these to whatever the consumer registered themselves,
      // so a worker can serve its own activities alongside these three.
      activities: createActivities(options),
    });

    this.taskQueue = options.taskQueue ?? DEFAULT_TASK_QUEUE;
  }
}
