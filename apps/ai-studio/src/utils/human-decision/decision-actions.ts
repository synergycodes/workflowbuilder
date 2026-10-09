import { hasText } from '../has-text';
import { isPlainObject } from '../is-plain-object';

type Offer = { name: string; label: string };

export type ResumeOffer = Offer;

export type RejectOffer = Offer & { reasonRequired: boolean };

/** What the decider can do: every resume action in the request's order, never empty, and the reject when there is one. */
export type OfferedActions = { resumes: ResumeOffer[]; reject: RejectOffer | undefined };

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
  const resumes = entries.filter((entry) => entry['effect'] === 'resume').flatMap((entry) => offerOf(entry) ?? []);
  const reject = rejectOfferOf(entries.find((entry) => entry['effect'] === 'reject'));
  return resumes.length === 0 ? undefined : { resumes, reject };
}
