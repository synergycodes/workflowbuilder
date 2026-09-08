// Every message the decision-contract validation can produce. `{value}` is the one
// interpolation slot. Structural failures (wrong type, missing key) keep zod's wording.
export const DECISION_ISSUE_MESSAGES = {
  actions_empty: 'at least one action is required',
  name_empty: 'name must not be empty',
  label_empty: 'label must not be empty',
  unknown_effect: 'effect must be one of {value}',
  duplicate_action_name: "action name '{value}' is used more than once",
  duplicate_effect: "only one action may have effect '{value}'",
  resume_required: "an action with effect 'resume' is required",
  port_empty: 'port must not be empty',
  port_reserved: "port must not be the reserved 'errorRoute'",
  reject_port_equals_resume_port: "reject port '{value}' must differ from the resume port",
  required_field_undeclared: "required field '{value}' is not declared in properties",
  deadline_format: "must be a positive duration such as '30s', '24h' or '3d' (a number followed by ms, s, m, h or d)",
  deadline_policy: "policy must be 'reject'",
  source_node_without_decision: 'this node carries no decision contract',
  source_not_a_predecessor: "proposalSourceNodeId '{value}' is not a direct predecessor of this node",
  source_missing: 'a rerun-source action needs a proposal source, but this node has no predecessor',
  source_ambiguous: 'several predecessors; set proposalSourceNodeId to say which one rerun-source re-runs',
  source_has_decision: "proposal source '{value}' carries its own decision contract and cannot be re-run",
} as const;

export type DecisionIssueCode = keyof typeof DECISION_ISSUE_MESSAGES;

export function decisionIssueMessage(code: DecisionIssueCode, value?: string): string {
  // A function replacer, so a value containing `$&` or `$1` lands verbatim.
  return DECISION_ISSUE_MESSAGES[code].replace('{value}', () => value ?? '');
}

export function decisionIssue(code: DecisionIssueCode, path: PropertyKey[], value?: string) {
  return { code: 'custom' as const, message: decisionIssueMessage(code, value), path };
}
