import type { VariableType } from '../../../node/node-output-schema';
import type { MaybeVariableReference } from '../types';
import { getSingleVariableMetadataIfPossible } from './get-single-variable-metadata-if-possible';

/**
 * Returns the type for a value that is a single variable.
 *
 * Supports global variables (`{{global.<id>}}`) and previous node variables
 * (`{{nodes.<nodeId>.propertyName}}`), with or without brackets.
 *
 * Returns `undefined` when the value isn't a single variable or the variable can't be resolved.
 */
export function getSingleVariableTypeIfPossible(maybeReference: MaybeVariableReference): VariableType | undefined {
  const metadata = getSingleVariableMetadataIfPossible(maybeReference);

  if (!metadata) {
    return;
  }

  return metadata.type;
}
