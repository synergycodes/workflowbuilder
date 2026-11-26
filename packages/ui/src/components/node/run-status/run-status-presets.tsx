import { ArrowClockwise, Check, Clock, LinkBreak, Question, SkipForward, Warning, X } from '@phosphor-icons/react';

import type { NodeFooterProps } from '../node-footer/node-footer';
import type { NodeRunBadgeProps } from '../node-run-badge/node-run-badge';
import type { NodeRunIndicatorProps } from '../node-run-indicator/node-run-indicator';
import type { NodeRunRingProps } from '../node-run-ring/node-run-ring';

/**
 * The thirteen run statuses of the Workflow Builder design system.
 *
 * @category Node
 */
export type NodeRunStatus =
  | 'running'
  | 'noSignal'
  | 'retrying'
  | 'completed'
  | 'incomplete'
  | 'failed'
  | 'rejected'
  | 'waitingForHuman'
  | 'waitingExternal'
  | 'waitingUntil'
  | 'partialJoin'
  | 'cancelled'
  | 'skipped';

/**
 * The parts one run status is drawn with, each shaped as the props of its component, so a part spreads straight
 * onto it: `<NodeRunRing {...preset.ring} />`. A status without `indicator` shows none; `veil` adds a `NodeRunVeil`.
 * `footer` holds the design-system copy of a `NodeFooter`, on the statuses that have one.
 *
 * @category Node
 */
export type NodeRunStatusPreset = Readonly<{
  ring: Readonly<Pick<NodeRunRingProps, 'tone' | 'halo'>>;
  indicator?: Readonly<NodeRunIndicatorProps>;
  badge: Readonly<Pick<NodeRunBadgeProps, 'tone' | 'icon' | 'dimmed'> & { label: string }>;
  veil?: boolean;
  footer?: Readonly<Pick<NodeFooterProps, 'tone' | 'message'>>;
}>;

type FooterStatus = 'failed' | 'waitingForHuman' | 'waitingExternal' | 'waitingUntil' | 'partialJoin' | 'cancelled';

/**
 * Default parts of each design-system run status. The SDK does not use them: an application maps its own run states
 * to these presets, or composes the parts itself. The presets are read-only: to use the application's copy, spread a
 * part into a new object, `{ ...preset.badge, label: t('run.running') }`.
 *
 * @category Node
 */
export const runStatusPresets: Readonly<
  Record<NodeRunStatus, NodeRunStatusPreset> & Record<FooterStatus, Required<Pick<NodeRunStatusPreset, 'footer'>>>
> = {
  running: {
    ring: { tone: 'info', halo: 'static' },
    indicator: { tone: 'info', spinner: 'running' },
    badge: { tone: 'info', label: 'Running' },
  },
  noSignal: {
    ring: { tone: 'warning', halo: 'static' },
    indicator: { tone: 'warning', spinner: 'slow' },
    badge: { tone: 'warning', icon: <Question />, label: 'No signal' },
  },
  retrying: {
    ring: { tone: 'warning', halo: 'static' },
    indicator: { tone: 'warning', spinner: 'running' },
    badge: { tone: 'warning', icon: <ArrowClockwise />, label: 'Retrying in the background' },
  },
  completed: {
    ring: { tone: 'success' },
    indicator: { tone: 'success', icon: <Check /> },
    badge: { tone: 'success', label: 'Completed' },
  },
  incomplete: {
    ring: { tone: 'success' },
    indicator: { tone: 'success', icon: <Check /> },
    badge: { tone: 'warning', icon: <LinkBreak />, label: 'Incomplete' },
  },
  failed: {
    ring: { tone: 'critical' },
    indicator: { tone: 'critical', icon: <Warning /> },
    badge: { tone: 'critical', label: 'Failed' },
    footer: { tone: 'critical', message: 'Step failed' },
  },
  rejected: {
    ring: { tone: 'inverse' },
    indicator: { tone: 'neutral', iconTone: 'inverse', icon: <X /> },
    badge: { tone: 'inverse', label: 'Rejected' },
  },
  waitingForHuman: {
    ring: { tone: 'human', halo: 'waiting' },
    indicator: { tone: 'human', icon: <Clock /> },
    badge: { tone: 'human', label: 'Waiting' },
    footer: { tone: 'human', message: 'Decision needed' },
  },
  waitingExternal: {
    ring: { tone: 'info', halo: 'waiting' },
    indicator: { tone: 'info', icon: <Clock /> },
    badge: { tone: 'info', label: 'Waiting' },
    footer: { tone: 'info', message: 'Waiting for external system' },
  },
  waitingUntil: {
    ring: { tone: 'neutral' },
    indicator: { tone: 'neutral', icon: <Clock /> },
    badge: { tone: 'neutral', label: 'Waiting until' },
    footer: { tone: 'neutral', message: 'Waiting for timer' },
  },
  partialJoin: {
    ring: { tone: 'neutral' },
    indicator: { tone: 'neutral', icon: <Clock /> },
    badge: { tone: 'neutral', label: 'Waiting for input' },
    footer: { tone: 'neutral', message: 'Waiting for inputs' },
  },
  cancelled: {
    ring: { tone: 'neutral' },
    indicator: { tone: 'neutral', icon: <X /> },
    badge: { tone: 'neutral', label: 'Cancelled' },
    footer: { tone: 'neutral', message: 'Run cancelled' },
  },
  skipped: {
    ring: { tone: 'neutral' },
    badge: { tone: 'neutral', icon: <SkipForward />, label: 'Skipped', dimmed: true },
    veil: true,
  },
};
