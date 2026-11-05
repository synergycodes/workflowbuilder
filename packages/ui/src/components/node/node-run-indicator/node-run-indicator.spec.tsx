import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss from 'postcss';

import { NodeRunIndicator } from './node-run-indicator';

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

  it('is hidden from assistive technology', () => {
    act(() => root.render(<NodeRunIndicator tone="info" spinner="running" />));

    expect(indicator().getAttribute('aria-hidden')).toBe('true');
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
