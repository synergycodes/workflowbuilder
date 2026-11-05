import { Check, Clock, PlayCircle, Warning, X } from '@phosphor-icons/react';
import {
  NodeDescription,
  NodeIcon,
  NodePanel,
  NodeRing,
  type NodeRingProps,
  NodeRunBadge,
  NodeRunIndicator,
  type NodeRunIndicatorProps,
  NodeRunProgress,
  NodeVeil,
  type RunStatus,
  type RunStatusPreset,
  type RunStatusTone,
  runStatusPresets,
} from '@workflowbuilder/ui';
import type { CSSProperties, ReactNode } from 'react';

import { ComponentPreview } from './component-preview';

const TONES: RunStatusTone[] = ['info', 'success', 'warning', 'critical', 'human', 'neutral', 'inverse'];

// Room above each node for its badge.
const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, max-content)',
  gap: '2.75rem 1.5rem',
  paddingTop: '2rem',
};
const caption: CSSProperties = { marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.7 };

type DemoNodeProps = {
  title?: string;
  selected?: boolean;
  indicator?: NodeRunIndicatorProps;
  caption?: string;
  children?: ReactNode;
};

function DemoNode({ title = 'Node title', selected = false, indicator, caption: text, children }: DemoNodeProps) {
  return (
    <div>
      <NodePanel.Root selected={selected}>
        <NodePanel.Header>
          <NodeIcon icon={<PlayCircle />} />
          <NodeDescription label={title} description="Subtitle" />
          {indicator && <NodeRunIndicator {...indicator} />}
        </NodePanel.Header>
        {children && <NodePanel.Overlay>{children}</NodePanel.Overlay>}
      </NodePanel.Root>
      {text && <div style={caption}>{text}</div>}
    </div>
  );
}

export function NodeRingExample() {
  const rings: (NodeRingProps & { caption: string; selected?: boolean })[] = [
    ...TONES.map((tone) => ({ tone, caption: tone })),
    { tone: 'info', halo: 'static', caption: "info, halo 'static'" },
    { tone: 'info', halo: 'heartbeat', caption: "info, halo 'heartbeat'" },
    { tone: 'human', halo: 'waiting', caption: "human, halo 'waiting'" },
    { tone: 'info', halo: 'static', selected: true, caption: 'selected, focus ring hidden' },
  ];

  return (
    <ComponentPreview>
      <div style={grid}>
        {rings.map(({ caption: text, selected, ...ring }) => (
          <DemoNode key={text} caption={text} selected={selected}>
            <NodeRing {...ring} />
          </DemoNode>
        ))}
      </div>
    </ComponentPreview>
  );
}

export function NodeVeilExample() {
  return (
    <ComponentPreview>
      <DemoNode>
        <NodeRing tone="neutral" />
        <NodeVeil />
      </DemoNode>
    </ComponentPreview>
  );
}

export function NodeRunProgressExample() {
  return (
    <ComponentPreview>
      <ComponentPreview.Row>
        <DemoNode indicator={{ tone: 'info', spinner: 'running' }} caption="35%">
          <NodeRing tone="info" halo="heartbeat" />
          <NodeRunProgress value={35} />
        </DemoNode>
        <DemoNode indicator={{ tone: 'info', spinner: 'running' }} caption="80%">
          <NodeRing tone="info" halo="heartbeat" />
          <NodeRunProgress value={80} />
        </DemoNode>
      </ComponentPreview.Row>
    </ComponentPreview>
  );
}

export function NodeRunIndicatorExample() {
  return (
    <ComponentPreview>
      <ComponentPreview.Stack>
        <ComponentPreview.Row>
          <NodeRunIndicator tone="info" spinner="running" />
          <NodeRunIndicator tone="warning" spinner="slow" />
          <NodeRunIndicator tone="success" icon={<Check />} />
          <NodeRunIndicator tone="critical" icon={<Warning />} />
          <NodeRunIndicator tone="human" icon={<Clock />} />
          <NodeRunIndicator tone="neutral" icon={<X />} />
          <NodeRunIndicator tone="neutral" iconTone="inverse" icon={<X />} />
        </ComponentPreview.Row>
        <DemoNode title="A long node title that truncates" indicator={{ tone: 'success', icon: <Check /> }} />
      </ComponentPreview.Stack>
    </ComponentPreview>
  );
}

export function NodeRunBadgeExample() {
  return (
    <ComponentPreview>
      <div style={grid}>
        {TONES.map((tone) => (
          <DemoNode key={tone} caption={tone}>
            <NodeRunBadge tone={tone} label={tone} />
          </DemoNode>
        ))}
        <DemoNode caption="neutral, dimmed">
          <NodeRunBadge tone="neutral" label="Skipped" dimmed />
        </DemoNode>
      </div>
    </ComponentPreview>
  );
}

const STATUS_NAMES: Record<RunStatus, string> = {
  running: 'Running',
  noSignal: 'No signal',
  retrying: 'Retrying',
  completed: 'Completed',
  incomplete: 'Incomplete',
  failed: 'Failed',
  rejected: 'Rejected',
  waitingForHuman: 'Waiting for human',
  waitingExternal: 'Waiting external',
  waitingUntil: 'Waiting until',
  partialJoin: 'Partial join',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
};

function PresetNode({ preset, caption: text }: { preset: RunStatusPreset; caption: string }) {
  return (
    <DemoNode indicator={preset.indicator} caption={text}>
      <NodeRing {...preset.ring} />
      {preset.veil && <NodeVeil />}
      <NodeRunBadge {...preset.badge} />
    </DemoNode>
  );
}

export function RunStatusExample() {
  return (
    <ComponentPreview>
      <div style={grid}>
        {(Object.entries(runStatusPresets) as [RunStatus, RunStatusPreset][]).map(([status, preset]) => (
          <PresetNode key={status} preset={preset} caption={`${STATUS_NAMES[status]} · ${status}`} />
        ))}
        <DemoNode indicator={runStatusPresets.running.indicator} caption="Running with progress">
          <NodeRing tone="info" halo="heartbeat" />
          <NodeRunProgress value={60} />
          <NodeRunBadge {...runStatusPresets.running.badge} />
        </DemoNode>
      </div>
    </ComponentPreview>
  );
}
