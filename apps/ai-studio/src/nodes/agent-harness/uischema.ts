import { getScope } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

import type { AgentHarnessSchema } from './schema';

const scope = getScope<AgentHarnessSchema>;

// The SDK's `UISchema` control elements have no `description`/help-text slot (see
// `packages/sdk/src/types/controls.ts` — only `label`/`placeholder`). The plan's suggested
// per-field "description" mechanism does not exist, so out-scoped fields communicate their
// "not yet supported" status through the `label` and `placeholder` text instead. This is a
// documented deviation from the plan's assumption, not an omission — see the M7 handoff.
export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Accordion',
      label: 'General',
      elements: [
        {
          type: 'Text',
          scope: scope('properties.label'),
          label: 'Title',
          placeholder: 'Node Title...',
        },
        {
          type: 'TextArea',
          scope: scope('properties.prompt'),
          label: 'Prompt',
          placeholder: 'Describe the task for the agent... supports {{ nodes.<id>.output }} references',
          minRows: 5,
          maxRows: 14,
        },
        {
          type: 'Select',
          scope: scope('properties.provider'),
          label: 'Provider',
        },
      ],
    },
    {
      type: 'Accordion',
      label: 'Execution',
      elements: [
        {
          type: 'Text',
          scope: scope('properties.model'),
          label: 'Model',
          placeholder: 'auto',
        },
        {
          type: 'Select',
          scope: scope('properties.effort'),
          label: 'Effort',
        },
        {
          type: 'Select',
          scope: scope('properties.context'),
          label: 'Context (only "Fresh" is supported today)',
        },
        {
          type: 'Text',
          scope: scope('properties.idle_timeout'),
          label: 'Idle timeout (ms)',
          placeholder: 'Defaults to 30 minutes',
        },
      ],
    },
    {
      type: 'Accordion',
      label: 'Tools',
      elements: [
        {
          type: 'Select',
          scope: scope('properties.toolsMode'),
          label: 'Tools preset (UI convenience — reflect manually into the lists below)',
        },
        {
          type: 'Text',
          scope: scope('properties.allowedTools'),
          label: 'Allowed tools (comma-separated)',
          placeholder: 'e.g. read_file, write_file',
        },
        {
          type: 'Text',
          scope: scope('properties.deniedTools'),
          label: 'Denied tools (comma-separated)',
          placeholder: 'e.g. shell_exec',
        },
      ],
    },
    {
      type: 'Accordion',
      label: 'Advanced',
      elements: [
        {
          type: 'TextArea',
          scope: scope('properties.output_format'),
          label: 'Output format (JSON — not yet supported, backend does not enforce it)',
          placeholder: '{ "type": "json" }',
          minRows: 3,
          maxRows: 8,
        },
        {
          type: 'Text',
          scope: scope('properties.mcp'),
          label: 'MCP config path (not yet supported)',
          placeholder: '/path/to/mcp.json',
        },
        {
          type: 'Text',
          scope: scope('properties.skills'),
          label: 'Skills (comma-separated, not yet supported)',
          placeholder: 'e.g. code-review, testing',
        },
        {
          type: 'TextArea',
          scope: scope('properties.agents'),
          label: 'Sub-agents (JSON)',
          placeholder: '{ "reviewer": { "description": "...", "prompt": "..." } }',
          minRows: 3,
          maxRows: 8,
        },
        {
          type: 'Text',
          scope: scope('properties.maxBudgetUsd'),
          label: 'Max budget (USD, not yet supported)',
          placeholder: 'e.g. 5',
        },
        {
          type: 'Switch',
          scope: scope('properties.mutatesCheckout'),
          label: 'Mutates checkout (node may write to the working tree)',
        },
        {
          type: 'Switch',
          scope: scope('properties.persistSession'),
          label: 'Persist session (not yet supported)',
        },
      ],
    },
  ],
};
