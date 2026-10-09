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

// Authored node data: only the array is proven. A `rerun-source` action is left out: the endpoint answers 501 for it.
export function offeredActions(actions: readonly unknown[]): OfferedActions | undefined {
  const resumes: ResumeOffer[] = [];
  let reject: RejectOffer | undefined;
  let rejectSeen = false;
  const seen = new Set<string>();
  for (const entry of actions.filter(isPlainObject)) {
    const effect = entry['effect'];
    if (effect === 'reject') {
      if (rejectSeen) {
        continue;
      }
      rejectSeen = true;
    } else if (effect !== 'resume') {
      continue;
    }
    const offer = offerOf(entry);
    // Publish refuses a repeated name, but the form reads the canvas node and the backend decides by the first action
    // of a name, so a later namesake is left out here too.
    if (offer === undefined || seen.has(offer.name)) {
      continue;
    }
    seen.add(offer.name);
    if (effect === 'resume') {
      resumes.push(offer);
    } else {
      reject = { ...offer, reasonRequired: entry['reasonRequired'] === true };
    }
  }
  return resumes.length === 0 ? undefined : { resumes, reject };
}
