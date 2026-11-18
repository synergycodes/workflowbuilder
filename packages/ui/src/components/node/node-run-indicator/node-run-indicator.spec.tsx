import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss from 'postcss';

import { RUN_STATUS_TONES } from '../run-status/run-status-tone';
import { NodeRunIndicator } from './node-run-indicator';

const CIRCLE_TONES = RUN_STATUS_TONES.filter((tone) => tone !== 'inverse');

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

// Never called: `pnpm typecheck` fails if the circle accepts `inverse`, whose glyph would match it.
function _inverseCircle() {
  // @ts-expect-error inverse is a glyph tone only
  return <NodeRunIndicator tone="inverse" icon={<svg />} />;
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
});

const paletteFile = path.join(import.meta.dirname, '../run-status/variables.css');
const palette = new Map<string, string>();
postcss.parse(readFileSync(paletteFile, 'utf8'), { from: paletteFile }).walkDecls((declaration) => {
  palette.set(declaration.prop, declaration.value);
});

function throughPalette(value = '') {
  const name = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return (name && palette.get(name)) ?? value;
}

describe('node-run-indicator.module.css', () => {
  const file = path.join(import.meta.dirname, 'node-run-indicator.module.css');
  const stylesheet = postcss.parse(readFileSync(file, 'utf8'), { from: file });

  function declaration(selector: string, property: string) {
    let value: string | undefined;
    stylesheet.walkRules(selector, (rule) => {
      rule.walkDecls(property, (found) => {
        value = found.value;
      });
    });
    return value;
  }

  it.each(CIRCLE_TONES)('colours the %s circle with the DS run status bg token', (tone) => {
    expect(throughPalette(declaration(`.indicator[data-tone='${tone}']`, '--indicator-background-color'))).toBe(
      `var(--wb-ds-canvas-run-status-bg-${tone})`,
    );
  });

  it.each(RUN_STATUS_TONES)('colours the %s glyph with the DS run status fg token', (tone) => {
    expect(throughPalette(declaration(`.indicator[data-icon-tone='${tone}']`, '--indicator-icon-color'))).toBe(
      `var(--wb-ds-canvas-run-status-fg-${tone})`,
    );
  });

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
