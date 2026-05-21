import { NODE_ERROR_POLICIES, type NodeErrorPolicy } from '@workflow-builder/types/workflow-execution/execution-model';

import type { BaseNodePropertiesSchema } from '../node/node-schema';

/**
 * Reusable schema fragment for the properties every node carries by default:
 * `label` and `description`. Spread this into a custom
 * `NodeSchema['properties']` to avoid redeclaring them per node type.
 *
 * @category Utilities
 */
export const sharedProperties: BaseNodePropertiesSchema = {
  label: {
    type: 'string',
  },
  description: {
    type: 'string',
  },
};

// User-facing label per policy literal. The values come from
// `NODE_ERROR_POLICIES` in `@workflow-builder/types`; this map only owns the
// display strings — adding a new policy is a one-line change in `types`
// followed by adding its label here.
const ERROR_POLICY_LABELS: Record<NodeErrorPolicy, string> = {
  fail: 'Fail workflow',
  continue: 'Continue on error',
  errorRoute: "Route to 'error' branch",
};

/**
 * Opt-in schema fragment exposing the runner's `errorPolicy` as a
 * Select. Spread alongside {@link sharedProperties} on node types that
 * should surface the choice in the properties panel; omit it elsewhere —
 * the runner defaults to `'fail'` when the field is absent.
 *
 * @category Utilities
 */
export const errorPolicyProperty = {
  errorPolicy: {
    type: 'string',
    options: NODE_ERROR_POLICIES.map((value) => ({
      label: ERROR_POLICY_LABELS[value],
      value,
    })),
  },
} as const;
