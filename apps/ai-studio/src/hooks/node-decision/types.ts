export type DecisionField = {
  value: unknown;
  label: string;
  reference: string;
  type: string;
};

export const DECISION_PHASE = {
  NONE: 'none',
  WAITING: 'waiting',
  DECIDED: 'decided',
} as const;

export type DecisionState = (typeof DECISION_PHASE)[keyof typeof DECISION_PHASE];
