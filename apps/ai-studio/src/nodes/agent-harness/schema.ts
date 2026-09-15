import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

// Only Copilot is functionally wired in v1 (see `apps/execution-worker/src/agent-harness/registry.ts`).
// Kept as a single-entry option list, rather than a plain string, so the Select still renders — a
// second provider is a one-line addition here once its backend lands (per issue #147 parity intent).
const providerOptions = [{ label: 'GitHub Copilot', value: 'copilot' }];

// Copilot's own effort ladder (`COPILOT_EFFORTS` in providers/copilot/config.ts) is narrower than the
// full cross-provider `EffortRung` union — only offer the rungs this provider actually honors.
const effortOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Extra high', value: 'xhigh' },
];

// 'shared'/'resume' are NOT YET SUPPORTED (session persistence is out of scope for v1, see the
// implementation plan §2) — rendered anyway per issue #147 ("fields must still render").
const contextOptions = [
  { label: 'Fresh (new session)', value: 'fresh' },
  { label: 'Shared (not yet supported)', value: 'shared' },
  { label: 'Resume (not yet supported)', value: 'resume' },
];

// UI-only convenience preset; expanding it into allowedTools/deniedTools is a manual step for now
// (no automatic preset -> field wiring in this milestone, see nodes/agent-harness/index.ts handoff).
const toolsModeOptions = [
  { label: 'None', value: 'none' },
  { label: 'Read-only', value: 'read-only' },
  { label: 'Edit-only', value: 'edit-only' },
  { label: 'All tools', value: 'all' },
];

export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    prompt: {
      type: 'string',
    },
    provider: {
      type: 'string',
      options: providerOptions,
    },
    model: {
      type: 'string',
    },
    effort: {
      type: 'string',
      options: effortOptions,
    },
    context: {
      type: 'string',
      options: contextOptions,
    },
    idle_timeout: {
      type: 'number',
    },
    toolsMode: {
      type: 'string',
      options: toolsModeOptions,
    },
    allowedTools: {
      type: 'string',
    },
    deniedTools: {
      type: 'string',
    },
    output_format: {
      type: 'string',
    },
    mcp: {
      type: 'string',
    },
    skills: {
      type: 'string',
    },
    agents: {
      type: 'string',
    },
    maxBudgetUsd: {
      type: 'number',
    },
    mutatesCheckout: {
      type: 'boolean',
    },
    persistSession: {
      type: 'boolean',
    },
  },
} satisfies NodeSchema;

export type AgentHarnessSchema = typeof schema;
