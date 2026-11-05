import { ArrowClockwise, Check, Clock, LinkBreak, Question, SkipForward, Warning, X } from '@phosphor-icons/react';

import type { NodeRingProps } from './node-ring/node-ring';
import type { NodeRunBadgeProps } from './node-run-badge/node-run-badge';
import type { NodeRunIndicatorProps } from './node-run-indicator/node-run-indicator';

/**
 * The thirteen run statuses of the Workflow Builder design system.
 *
 * @category Node
 */
export type RunStatus =
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
 * onto it: `<NodeRing {...preset.ring} />`. A status without `indicator` shows none; `veil` adds a `NodeVeil`.
 *
 * @category Node
 */
export type RunStatusPreset = {
  ring: Pick<NodeRingProps, 'tone' | 'halo'>;
  indicator?: NodeRunIndicatorProps;
  badge: Pick<NodeRunBadgeProps, 'tone' | 'icon' | 'dimmed'> & { label: string };
  veil?: boolean;
};

/**
 * Default parts of each design-system run status. The SDK does not use them: an application maps its own run states
 * to these presets, or composes the parts itself. Replace `badge.label` with the application's copy.
 */
export const runStatusPresets: Readonly<Record<RunStatus, RunStatusPreset>> = {
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
    badge: { tone: 'warning', icon: <ArrowClockwise />, label: 'Retrying' },
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
  },
  waitingExternal: {
    ring: { tone: 'info', halo: 'waiting' },
    indicator: { tone: 'info', icon: <Clock /> },
    badge: { tone: 'info', label: 'Waiting' },
  },
  waitingUntil: {
    ring: { tone: 'neutral' },
    indicator: { tone: 'neutral', icon: <Clock /> },
    badge: { tone: 'neutral', label: 'Waiting until' },
  },
  partialJoin: {
    ring: { tone: 'neutral' },
    indicator: { tone: 'neutral', icon: <Clock /> },
    badge: { tone: 'neutral', label: 'Waiting for input' },
  },
  cancelled: {
    ring: { tone: 'neutral' },
    indicator: { tone: 'neutral', icon: <X /> },
    badge: { tone: 'neutral', label: 'Cancelled' },
  },
  skipped: {
    ring: { tone: 'neutral' },
    badge: { tone: 'neutral', icon: <SkipForward />, label: 'Skipped', dimmed: true },
    veil: true,
  },
};
