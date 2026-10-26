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
  // The form keys a button and an open dialog by name, so a name is offered once.
  const named = actions
    .filter(isPlainObject)
    // A reject without a port has no handle on the canvas and Publish refuses it, so it counts as off.
    .filter((entry) => entry['effect'] === 'resume' || (isReject(entry) && hasText(entry['port'])))
    .filter((entry) => hasText(entry['name']))
    .filter((entry, index, all) => all.findIndex((other) => other['name'] === entry['name']) === index);
  const resumes = named.filter((entry) => entry['effect'] === 'resume').map((entry) => offerOf(entry) as Offer);
  const rejectEntry = named.find((entry) => entry['effect'] === 'reject');
  const reject = rejectEntry && {
    ...(offerOf(rejectEntry) as Offer),
    reasonRequired: rejectEntry['reasonRequired'] === true,
  };
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
