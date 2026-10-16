/** A variable the node's author picked for the decider: what the VariablesList control stores. */
export type DecisionFieldPick = {
  label: string;
  reference: string;
  type: string;
};

/** A pick with the value its reference resolves to in the current run. */
export type DecisionField = DecisionFieldPick & { value: unknown };

export const DECISION_PHASE = {
  NONE: 'none',
  WAITING: 'waiting',
  DECIDED: 'decided',
} as const;

export type DecisionState = (typeof DECISION_PHASE)[keyof typeof DECISION_PHASE];
