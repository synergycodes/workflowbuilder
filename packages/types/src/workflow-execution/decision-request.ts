/**
 * Effects a decision request may declare on its actions. `resume-with-edits` is deliberately absent:
 * it is never declared; the backend derives it when a `resume` call carries edits.
 */
export const DECLARABLE_DECISION_EFFECTS = ['resume', 'reject', 'rerun-source'] as const;

/** One of {@link DECLARABLE_DECISION_EFFECTS}. */
export type DeclarableDecisionEffect = (typeof DECLARABLE_DECISION_EFFECTS)[number];

/** Every effect a decision can take, including the derived `resume-with-edits`. */
export type DecisionEffect = DeclarableDecisionEffect | 'resume-with-edits';

type DecisionActionBase = {
  /**
   * What a submitted decision names. Unique within the request. Any string: the client's
   * vocabulary, not an engine keyword.
   */
  name: string;
  /** Text shown to the decider. */
  label: string;
};

/** Accepts the proposal, edited or not: the run continues on `port`. Exactly one per request. */
export type ResumeDecisionAction = DecisionActionBase & {
  effect: 'resume';
  /** Output handle the run continues on. Defaults to `approved`. Never `errorRoute`. */
  port: string;
};

/** Rejects the proposal: the run continues on `port`. At most one per request. */
export type RejectDecisionAction = DecisionActionBase & {
  effect: 'reject';
  /** Output handle the run continues on. Defaults to `rejected`. Must differ from the resume port. */
  port: string;
  /** Whether the decider must give a reason. Defaults to `false`. */
  reasonRequired: boolean;
};

/** Re-runs the proposal source with the decider's comment. At most one per request. */
export type RerunSourceDecisionAction = DecisionActionBase & {
  effect: 'rerun-source';
  /** Upper bound on re-runs of the proposal source. Integer of at least 1. Defaults to `3`. */
  maxIterations: number;
};

/**
 * One action the decider can take, discriminated on `effect`. `port`, `reasonRequired` and
 * `maxIterations` may be omitted in authored JSON; the backend parser materialises their
 * defaults, so a parsed request always carries them.
 */
export type DecisionAction = ResumeDecisionAction | RejectDecisionAction | RerunSourceDecisionAction;

/** Time limit on a node waiting for the decision. */
export type DecisionDeadline = {
  /**
   * Counted from the moment the node parks. A number followed by `ms`, `s`, `m`, `h` or `d`,
   * such as `'30s'` or `'3d'`.
   */
  after: string;
  /** What happens when `after` elapses. Typed open for future policies; only `'reject'` is accepted today. */
  policy: string;
};

/**
 * What a node asks a human to decide before the run continues. Authored under
 * `data.properties.decisionRequest` in the editor snapshot and lifted to `BaseNode.decisionRequest`.
 * Any node type may carry one. Unknown keys at every level are preserved.
 */
export type DecisionRequest = {
  /** Shape version of the request. A future shape change bumps it. */
  version: 1;
  /** Actions offered to the decider: exactly one `resume`, at most one `reject`, at most one `rerun-source`. */
  actions: DecisionAction[];
  /**
   * JSON Schema of the decision form. `readOnly: true` marks a field the decider cannot
   * edit; `x-pii: true` marks personal data. Opaque to the engine.
   */
  schema: Record<string, unknown>;
  /** JsonForms UI schema for the decision form. Passed through; never read by the backend. */
  uiSchema?: Record<string, unknown>;
  /**
   * The proposal source: the node whose output the decider judges. Must be a direct
   * predecessor of the deciding node; absent means its only predecessor.
   */
  proposalSourceNodeId?: string;
  /** Absent means the node waits forever. */
  deadline?: DecisionDeadline;
};
