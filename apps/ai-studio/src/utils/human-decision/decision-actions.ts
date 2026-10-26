import { hasText } from '../has-text';
import { isPlainObject } from '../is-plain-object';

export type ActionOffer = { name: string; label: string; reasonRequired: boolean };

/** What the decider can do: every resume action in the request's order, never empty, and the reject when there is one. */
export type OfferedActions = { resumes: [ActionOffer, ...ActionOffer[]]; reject: ActionOffer | undefined };

function offerOf(entry: Record<string, unknown>, name: string): ActionOffer {
  const label = entry['label'];
  return { name, label: hasText(label) ? label : name, reasonRequired: entry['reasonRequired'] === true };
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
    .flatMap((entry) =>
      hasText(entry['name']) ? [{ effect: entry['effect'], offer: offerOf(entry, entry['name']) }] : [],
    )
    .filter(({ offer }, index, all) => all.findIndex((other) => other.offer.name === offer.name) === index);
  const [first, ...further] = named.filter(({ effect }) => effect === 'resume').map(({ offer }) => offer);
  const reject = named.find(({ effect }) => effect === 'reject')?.offer;
  return first === undefined ? undefined : { resumes: [first, ...further], reject };
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
