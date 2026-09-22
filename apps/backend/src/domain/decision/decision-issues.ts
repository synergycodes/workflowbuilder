// Every message the decision-request validation can produce. `{value}` is the one
// interpolation slot. Structural failures (wrong type, missing key) keep zod's wording.
export const DECISION_ISSUE_MESSAGES = {
  actions_empty: 'at least one action is required',
  name_empty: 'name must not be blank',
  label_empty: 'label must not be blank',
  unknown_effect: 'effect must be one of {value}',
  duplicate_action_name: "action name '{value}' is used more than once",
  duplicate_effect: "only one action may have effect '{value}'",
  resume_required: "an action with effect 'resume' is required",
  port_empty: 'port must not be blank',
  port_reserved: "port must not be the reserved 'errorRoute'",
  port_not_allowed: 'a rerun-source action does not route and takes no port',
  reject_port_equals_resume_port: "reject port '{value}' must differ from the resume port",
  required_field_undeclared: "required field '{value}' is not declared in properties",
  deadline_format:
    "must be a duration such as '30s' or '3d' (number plus ms, s, m, h or d), above zero and at most '3652500d'",
  deadline_policy: "policy must be 'reject'",
  source_node_without_decision_request: 'this node carries no decision request',
  source_not_a_predecessor: "proposalSourceNodeId '{value}' is not a direct predecessor of this node",
  source_missing: 'a rerun-source action needs a proposal source, but this node has no predecessor',
  source_ambiguous: 'several predecessors; set proposalSourceNodeId to say which one rerun-source re-runs',
  source_has_decision_request: "proposal source '{value}' carries its own decision request and cannot be re-run",
} as const;

export type DecisionIssueCode = keyof typeof DECISION_ISSUE_MESSAGES;

// Every way a submitted decision can be refused against the node's decision request.
export const SUBMITTED_DECISION_ERRORS = {
  unknown_action: "the decision request offers no action named '{value}'",
  reason_required: "action '{value}' requires a reason",
  comment_required: "action '{value}' requires a comment",
  edits_not_allowed: "action '{value}' does not take edits",
  unknown_field: "field '{value}' is not in the decision schema",
  field_not_editable: "field '{value}' is read-only",
  required_field_missing: "required field '{value}' must not be emptied",
} as const;

export type SubmittedDecisionErrorCode = keyof typeof SUBMITTED_DECISION_ERRORS;

export function fill(template: string, value: string | undefined): string {
  // A function replacer, so a value containing `$&` or `$1` lands verbatim.
  return template.replace('{value}', () => value ?? '');
}

export function decisionIssueMessage(code: DecisionIssueCode, value?: string): string {
  return fill(DECISION_ISSUE_MESSAGES[code], value);
}

export function submittedDecisionErrorMessage(code: SubmittedDecisionErrorCode, value?: string): string {
  return fill(SUBMITTED_DECISION_ERRORS[code], value);
}

// Rides on the zod issue as `params` and is read back by the HTTP serializer, so a client
// branches and translates on the identifier and never on the wording of `message`.
export type DecisionIssueParams = { issue: DecisionIssueCode; value?: string };

function decisionIssueParams(code: DecisionIssueCode, value: string | undefined): DecisionIssueParams {
  return value === undefined ? { issue: code } : { issue: code, value };
}

export function decisionIssue(code: DecisionIssueCode, path: PropertyKey[], value?: string) {
  return {
    code: 'custom' as const,
    message: decisionIssueMessage(code, value),
    path,
    params: decisionIssueParams(code, value),
  };
}

// The same issue, shaped as the options a `.refine` takes.
export function decisionRefinement(code: DecisionIssueCode, value?: string) {
  return { error: decisionIssueMessage(code, value), params: decisionIssueParams(code, value) };
}

export function decisionIssueOf(issue: unknown): DecisionIssueParams | undefined {
  const params = typeof issue === 'object' && issue !== null ? (issue as { params?: unknown }).params : undefined;
  if (typeof params !== 'object' || params === null) return undefined;
  const { issue: code, value } = params as { issue?: unknown; value?: unknown };
  if (typeof code !== 'string' || !Object.hasOwn(DECISION_ISSUE_MESSAGES, code)) return undefined;
  return decisionIssueParams(code as DecisionIssueCode, typeof value === 'string' ? value : undefined);
}
