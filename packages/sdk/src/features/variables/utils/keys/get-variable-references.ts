import { VARIABLE_BRACKETS_END, VARIABLE_BRACKETS_START } from '../../constants';
import type { MaybeVariableReference, VariableReference } from '../../types';
import { getIsStringVariableReferenceStart } from './get-is-string-variable-reference';
import { getVariableReferenceIfPossible } from './get-variable-reference-if-possible';

type Response =
  | {
      reference: VariableReference;
      referenceWithoutBrackets: string;
    }
  | {
      reference: undefined;
      referenceWithoutBrackets: undefined;
    };

const INVALID_RESPONSE: Response = {
  reference: undefined,
  referenceWithoutBrackets: undefined,
};

/**
 * Resolves a value into both forms of a single variable reference.
 *
 * Accepts a bracketed reference (`{{global.total}}`) or a bare key (`global.total`),
 * trimming surrounding whitespace. Returns `reference` (always bracketed) and
 * `referenceWithoutBrackets` (always bare).
 *
 * Returns both fields as `undefined` when the value is empty, contains whitespace
 * inside the reference, has unbalanced brackets, or holds anything other than
 * exactly one reference (e.g. `{{a}} {{b}}`, `{{a}}x`).
 */
export function getVariableReferences(keyOrReference: MaybeVariableReference): Response {
  const stringToParse = keyOrReference?.trim() || '';
  if (!stringToParse) {
    return INVALID_RESPONSE;
  }

  const isMaybeReference = getIsStringVariableReferenceStart(stringToParse);
  const maybeReference = isMaybeReference
    ? stringToParse
    : `${VARIABLE_BRACKETS_START}${stringToParse}${VARIABLE_BRACKETS_END}`;

  const reference = getVariableReferenceIfPossible(maybeReference);

  if (!reference) {
    return INVALID_RESPONSE;
  }

  const referenceWithoutBrackets = isMaybeReference
    ? stringToParse.slice(VARIABLE_BRACKETS_START.length).slice(0, -1 * VARIABLE_BRACKETS_END.length)
    : stringToParse;

  return {
    reference,
    referenceWithoutBrackets,
  };
}
