export const VARIABLE_PANE = {
  LIST: 'list',
  ADD: 'add',
  EDIT: 'edit',
  REMOVE: 'remove',
} as const;

export type VariablePane = (typeof VARIABLE_PANE)[keyof typeof VARIABLE_PANE];
