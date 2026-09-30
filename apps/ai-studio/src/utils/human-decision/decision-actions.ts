import { hasText } from '../has-text';
import { isPlainObject } from '../is-plain-object';

type Offer = { name: string; label: string };

export type RejectOffer = Offer & { reasonRequired: boolean };

/** What the decider can do. */
export type OfferedActions = { resume: Offer; reject: RejectOffer | undefined };

function offerOf(entry: Record<string, unknown> | undefined): Offer | undefined {
  const name = entry?.['name'];
  if (!hasText(name)) {
    return undefined;
  }
  const label = entry?.['label'];
  return { name, label: hasText(label) ? label : name };
}

function rejectOfferOf(entry: Record<string, unknown> | undefined): RejectOffer | undefined {
  const offer = offerOf(entry);
  return offer === undefined ? undefined : { ...offer, reasonRequired: entry?.['reasonRequired'] === true };
}

// Authored node data: only the array is proven. A `rerun-source` action is left out: the endpoint answers 501 for it.
export function offeredActions(actions: readonly unknown[]): OfferedActions | undefined {
  const entries = actions.filter(isPlainObject);
  const withEffect = (effect: string) => entries.find((entry) => entry['effect'] === effect);
  const resume = offerOf(withEffect('resume'));
  return resume === undefined ? undefined : { resume, reject: rejectOfferOf(withEffect('reject')) };
}

function isReject(entry: unknown): entry is Record<string, unknown> {
  return isPlainObject(entry) && entry['effect'] === 'reject';
}

/** The port the reject action routes on, when the request has one. */
export function rejectPortOf(actions: readonly unknown[]): string | undefined {
  const port = actions.find(isReject)?.['port'];
  return hasText(port) ? port : undefined;
}

/** The actions with the reject turned on or off; turned on, it is `rejectAction`, a stored reject is kept. */
export function withReject(actions: readonly unknown[], on: boolean, rejectAction: unknown): unknown[] {
  if (!on) {
    return actions.filter((entry) => !isReject(entry));
  }
  return actions.some(isReject) ? [...actions] : [...actions, rejectAction];
}

export function withReasonRequired(actions: readonly unknown[], reasonRequired: boolean): unknown[] {
  return actions.map((entry) => (isReject(entry) ? { ...entry, reasonRequired } : entry));
}
