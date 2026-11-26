import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type CSSProperties, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss from 'postcss';

import { NODE_RUN_TONES } from '../run-status/run-status-tone';
import { throughPalette } from '../run-status/test-utils';
import { NodeRunIndicator } from './node-run-indicator';

const CIRCLE_TONES = NODE_RUN_TONES.filter((tone) => tone !== 'inverse');

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

function indicator() {
  return container.firstElementChild as HTMLElement;
}

function color(property: string) {
  return indicator().style.getPropertyValue(property);
}

describe('NodeRunIndicator', () => {
  it('colours the glyph with the circle tone unless iconTone is set', () => {
    act(() => root.render(<NodeRunIndicator tone="success" icon={<svg />} />));
    expect(indicator().dataset['iconTone']).toBe('success');

    act(() => root.render(<NodeRunIndicator tone="neutral" iconTone="inverse" icon={<svg />} />));
    expect(indicator().dataset['tone']).toBe('neutral');
    expect(indicator().dataset['iconTone']).toBe('inverse');
  });

  it('renders the spinner instead of a glyph', () => {
    act(() => root.render(<NodeRunIndicator tone="warning" spinner="slow" />));

    expect(indicator().querySelector('svg')).toBeNull();
    expect(indicator().querySelector('[data-spinner="slow"]')).not.toBeNull();
  });

  it('is hidden from assistive technology unless the caller overrides aria-hidden', () => {
    act(() => root.render(<NodeRunIndicator tone="info" spinner="running" />));
    expect(indicator().getAttribute('aria-hidden')).toBe('true');

    act(() => root.render(<NodeRunIndicator tone="info" spinner="running" aria-hidden={false} aria-label="Running" />));
    expect(indicator().getAttribute('aria-hidden')).toBe('false');
    expect(indicator().getAttribute('aria-label')).toBe('Running');
  });

  it.each(CIRCLE_TONES)('colours the %s circle with the DS run status bg token', (tone) => {
    act(() => root.render(<NodeRunIndicator tone={tone} icon={<svg />} />));

    expect(throughPalette(color('--indicator-background-color'))).toBe(`var(--wb-ds-canvas-run-status-bg-${tone})`);
  });

  it.each(NODE_RUN_TONES)('colours the %s glyph with the DS run status fg token', (tone) => {
    act(() => root.render(<NodeRunIndicator tone="neutral" iconTone={tone} icon={<svg />} />));

    expect(throughPalette(color('--indicator-icon-color'))).toBe(`var(--wb-ds-canvas-run-status-fg-${tone})`);
  });

  it('draws the neutral circle for the glyph-only inverse tone', () => {
    act(() => root.render(<NodeRunIndicator tone="inverse" icon={<svg />} />));

    expect(throughPalette(color('--indicator-background-color'))).toBe('var(--wb-ds-canvas-run-status-bg-neutral)');
    expect(indicator().dataset['tone']).toBe('inverse');
  });

  it('reads a custom tone from its own variables with the neutral fallback', () => {
    act(() => root.render(<NodeRunIndicator tone="paused" icon={<svg />} />));

    expect(color('--indicator-background-color')).toBe(
      'var(--wb-public-node-run-status-bg-paused, var(--wb-public-node-run-status-bg-neutral))',
    );
    expect(color('--indicator-icon-color')).toBe(
      'var(--wb-public-node-run-status-fg-paused, var(--wb-public-node-run-status-fg-neutral))',
    );
  });

  it.each(['My Tone', 'a b'])('uses the neutral colours for the invalid name %j', (tone) => {
    act(() => root.render(<NodeRunIndicator tone={tone} icon={<svg />} />));

    expect(color('--indicator-background-color')).toBe('var(--wb-public-node-run-status-bg-neutral)');
    expect(color('--indicator-icon-color')).toBe('var(--wb-public-node-run-status-fg-neutral)');
  });

  it('lets the consumer style override the tone variables and merges the rest', () => {
    const style = { opacity: 0.5, '--indicator-icon-color': 'red' } as CSSProperties;
    act(() => root.render(<NodeRunIndicator tone="info" icon={<svg />} style={style} />));

    expect(color('--indicator-icon-color')).toBe('red');
    expect(throughPalette(color('--indicator-background-color'))).toBe('var(--wb-ds-canvas-run-status-bg-info)');
    expect(indicator().style.opacity).toBe('0.5');
  });
});

describe('node-run-indicator.module.css', () => {
  const file = path.join(import.meta.dirname, 'node-run-indicator.module.css');
  const stylesheet = postcss.parse(readFileSync(file, 'utf8'), { from: file });

  it('stops the spinner under reduced motion, which leaves the arc on top', () => {
    let stopped = false;
    stylesheet.walkAtRules('media', (media) => {
      if (!media.params.includes('prefers-reduced-motion')) return;
      media.walkRules('.spinner', (rule) => {
        rule.walkDecls('animation', (declaration) => {
          stopped = declaration.value === 'none';
        });
      });
    });

    expect(stopped).toBe(true);
  });
});
