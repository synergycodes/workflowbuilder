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

function isReject(entry: unknown): entry is Record<string, unknown> {
  return isPlainObject(entry) && entry['effect'] === 'reject';
}

function offeredReject(actions: readonly unknown[]): RejectOffer | undefined {
  return rejectOfferOf(actions.find(isReject));
}

// Authored node data: only the array is proven. A `rerun-source` action is left out: the endpoint answers 501 for it.
export function offeredActions(actions: readonly unknown[]): OfferedActions | undefined {
  const resume = offerOf(actions.filter(isPlainObject).find((entry) => entry['effect'] === 'resume'));
  return resume === undefined ? undefined : { resume, reject: offeredReject(actions) };
}

export function rejectPortOf(actions: readonly unknown[]): string | undefined {
  const port = actions.find(isReject)?.['port'];
  return hasText(port) ? port : undefined;
}

/** Turned on, keeps a reject the decider is offered and replaces any other stored reject with `rejectAction`. */
export function withReject(actions: readonly unknown[], on: boolean, rejectAction: unknown): unknown[] {
  if (on && offeredReject(actions) !== undefined) {
    return [...actions];
  }
  const withoutReject = actions.filter((entry) => !isReject(entry));
  return on ? [...withoutReject, rejectAction] : withoutReject;
}

export function withReasonRequired(actions: readonly unknown[], reasonRequired: boolean): unknown[] {
  return actions.map((entry) => (isReject(entry) ? { ...entry, reasonRequired } : entry));
}
