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
