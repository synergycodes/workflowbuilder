import type { VariableType } from '@workflow-builder/types/node-output-schema';

import type { VariableInList } from '../types';

export function getVariableReference(variable: VariableInList): string {
  return variable.reference;
}

export function setVariableReference(base: { label: string; type: VariableType }, reference: string): VariableInList {
  return { label: base.label, type: base.type, reference };
}
