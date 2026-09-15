// Concrete node vocabulary for the AI Studio product. Owned by the worker,
// not by execution-core or @workflow-builder/types — those layers only know
// the generic BaseNode shape. A different product would define its own union
// here and register matching executors.
import type { BaseNode } from '@workflowbuilder/temporal';

import type { EffortRung } from '../agent-harness/types';

// Intersected with BaseNode so the runner-level fields it carries stay declared here,
// rather than arriving at runtime on a type that does not mention them.
type ProductNode<TType extends string, TConfig> = BaseNode & { type: TType; config: TConfig };

type TriggerNodeConfig = Record<string, never>;

type AiAgentNodeConfig = {
  systemPrompt: string; // supports {{namespace.path}} template references
  webSearch?: boolean; // needs TAVILY_API_KEY to take effect
  model?: string; // unset inherits env.AI_MODEL
  provider?: string; // 'auto' | 'openrouter' | known provider id | free text; unset behaves as 'auto'
};

export type DecisionBranchCondition = {
  x: string;
  y: string;
  comparisonOperator: string;
  logicalOperator?: 'AND' | 'OR';
};

type DecisionBranch = {
  id?: string;
  sourceHandle: string;
  label?: string;
  conditions: DecisionBranchCondition[];
};

type DecisionNodeConfig = {
  decisionBranches: DecisionBranch[];
};

// Display-only node; the UI reads the upstream output directly, so no runtime config.
type VisualizeNodeConfig = Record<string, never>;

// `[key: string]: unknown` mirrors the agent-harness provider contract's own `NodeConfig`
// (`agent-harness/types.ts`) — the executor forwards this config straight through to the
// provider layer, so restricting it here would just re-litigate that contract in a second
// place. Fields are all provider-facing pass-through except the four the executor itself
// interprets (`prompt`, `provider`, `credentialVendor`, `mutatesCheckout`).
type AgentHarnessNodeConfig = {
  /** Prompt template; resolved via {{namespace.path}} references before the executor runs it. */
  prompt: string;
  /** Provider registry id, e.g. 'copilot'. */
  provider: string;
  /** Vendor id for credential lookup (e.g. 'github-copilot'). Omit to rely on ambient auth (`copilot login`). */
  credentialVendor?: string;
  /**
   * When `false`, the node declares it must not leave the working tree dirty; a
   * detected mutation after a successful run turns the result into a non-retryable
   * failure (see `activities/agent-harness.ts`'s `assertCheckoutUntouched`).
   */
  mutatesCheckout?: boolean;
  /** Idle timeout in ms; falls back to `STEP_IDLE_TIMEOUT_MS` when unset. */
  idle_timeout?: number;
  allowed_tools?: string[];
  denied_tools?: string[];
  effort?: EffortRung;
  agents?: Record<
    string,
    {
      description: string;
      prompt: string;
      model?: string;
      tools?: string[];
      disallowedTools?: string[];
      skills?: string[];
      maxTurns?: number;
    }
  >;
  [key: string]: unknown;
};

export type TriggerNode = ProductNode<'ai-studio/trigger', TriggerNodeConfig>;

export type AiAgentNode = ProductNode<'ai-studio/ai-agent', AiAgentNodeConfig>;

export type DecisionNode = ProductNode<'ai-studio/decision', DecisionNodeConfig>;

type VisualizeNode = ProductNode<'ai-studio/visualize', VisualizeNodeConfig>;

export type AgentHarnessNode = ProductNode<'ai-studio/agent-harness', AgentHarnessNodeConfig>;

export type AiStudioNode = TriggerNode | AiAgentNode | DecisionNode | VisualizeNode | AgentHarnessNode;
