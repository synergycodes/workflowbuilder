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

function isReject(entry: unknown): entry is Record<string, unknown> {
  return isPlainObject(entry) && entry['effect'] === 'reject';
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
      const isFirst = !rejectSeen;
      rejectSeen = true;
      // A reject without a port has no handle on the canvas and Publish refuses it, so it counts as off.
      if (!isFirst || !hasText(entry['port'])) {
        continue;
      }
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

export function rejectPortOf(actions: readonly unknown[]): string | undefined {
  const port = actions.find(isReject)?.['port'];
  return hasText(port) ? port : undefined;
}

/** Drops every stored reject and, turned on, appends `rejectAction`. The switch turns it on only while it shows off. */
export function withReject(actions: readonly unknown[], on: boolean, rejectAction: unknown): unknown[] {
  const withoutReject = actions.filter((entry) => !isReject(entry));
  return on ? [...withoutReject, rejectAction] : withoutReject;
}

export function withReasonRequired(actions: readonly unknown[], reasonRequired: boolean): unknown[] {
  return actions.map((entry) => (isReject(entry) ? { ...entry, reasonRequired } : entry));
}
