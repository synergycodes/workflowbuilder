import { getVariableReferences } from '@workflowbuilder/sdk';

// JsonForms joins data paths with dots, so the reference's dots become slashes, the one separator the editor escapes.
// The reverse is `{{${key.replaceAll('/', '.')}}}`.
export function getFieldKey(reference: string): string | undefined {
  const { referenceWithoutBrackets } = getVariableReferences(reference);
  return referenceWithoutBrackets?.replaceAll('.', '/');
}
