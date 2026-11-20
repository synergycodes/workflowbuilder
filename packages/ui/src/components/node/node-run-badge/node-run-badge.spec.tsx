import { type CSSProperties, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import badgeStyles from '../../badge-label/badge-label.module.css';
import styles from './node-run-badge.module.css';

import { NODE_RUN_TONES } from '../run-status/run-status-tone';
import { throughPalette } from '../run-status/test-utils';
import { NodeRunBadge } from './node-run-badge';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const DS_TONES = NODE_RUN_TONES.filter((tone) => tone !== 'inverse');

function badge() {
  return container.firstElementChild as HTMLElement;
}

function color(property: string) {
  return badge().style.getPropertyValue(property);
}

describe('NodeRunBadge', () => {
  it('renders a size m BadgeLabel on the default variant', () => {
    act(() => root.render(<NodeRunBadge tone="info" label="Running" />));

    expect(badge().textContent).toBe('Running');
    expect(badge().classList).toContain(badgeStyles['m']);
    expect(badge().classList).not.toContain(badgeStyles['inverse']);
    expect(badge().classList).not.toContain(styles['dimmed']);
  });

  it('dims the label on request', () => {
    act(() => root.render(<NodeRunBadge tone="neutral" label="Skipped" dimmed />));

    expect(badge().classList).toContain(styles['dimmed']);
  });

  it.each(DS_TONES)('colours the %s label with the DS run status tokens', (tone) => {
    act(() => root.render(<NodeRunBadge tone={tone} label="Status" />));

    expect(throughPalette(color('--badge-label-background-color'))).toBe(`var(--wb-ds-canvas-run-status-bg-${tone})`);
    expect(throughPalette(color('--badge-label-color'))).toBe(`var(--wb-ds-canvas-run-status-fg-${tone})`);
  });

  it('renders the BadgeLabel Inverse variant for the inverse tone, without run status colours', () => {
    act(() => root.render(<NodeRunBadge tone="inverse" label="Rejected" />));

    expect(badge().classList).toContain(badgeStyles['inverse']);
    expect(badge().dataset['tone']).toBe('inverse');
    expect(color('--badge-label-background-color')).toBe('');
    expect(color('--badge-label-color')).toBe('');
  });

  it('reads a custom tone from its own variables with the neutral fallback', () => {
    act(() => root.render(<NodeRunBadge tone="paused" label="Paused" />));

    expect(color('--badge-label-background-color')).toBe(
      'var(--wb-public-node-run-status-bg-paused, var(--wb-public-node-run-status-bg-neutral))',
    );
    expect(color('--badge-label-color')).toBe(
      'var(--wb-public-node-run-status-fg-paused, var(--wb-public-node-run-status-fg-neutral))',
    );
  });

  it.each(['My Tone', 'a b'])('uses the neutral colours for the invalid name %j', (tone) => {
    act(() => root.render(<NodeRunBadge tone={tone} label="Status" />));

    expect(color('--badge-label-background-color')).toBe('var(--wb-public-node-run-status-bg-neutral)');
    expect(color('--badge-label-color')).toBe('var(--wb-public-node-run-status-fg-neutral)');
  });

  it('lets the consumer style override the tone variables and merges the rest', () => {
    const style = { opacity: 0.5, '--badge-label-color': 'red' } as CSSProperties;
    act(() => root.render(<NodeRunBadge tone="info" label="Running" style={style} />));

    expect(color('--badge-label-color')).toBe('red');
    expect(throughPalette(color('--badge-label-background-color'))).toBe('var(--wb-ds-canvas-run-status-bg-info)');
    expect(badge().style.opacity).toBe('0.5');
  });
});
