import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss, { type Rule } from 'postcss';

import type { RunStatusTone } from '../run-status/run-status-tone';
import { NodeRunRing } from './node-run-ring';

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

const TONES: RunStatusTone[] = ['info', 'success', 'warning', 'critical', 'human', 'neutral', 'inverse'];

function ring() {
  return container.firstElementChild as HTMLElement;
}

describe('NodeRunRing', () => {
  it('carries the run overlay marker and passes tone and halo to the stylesheet', () => {
    act(() => root.render(<NodeRunRing tone="human" halo="waiting" />));

    expect(ring().dataset['nodeRunOverlay']).toBeDefined();
    expect(ring().dataset['tone']).toBe('human');
    expect(ring().dataset['halo']).toBe('waiting');
  });

  it('forwards HTML attributes and merges the className', () => {
    act(() => root.render(<NodeRunRing tone="info" id="ring" className="custom" />));

    expect(ring().id).toBe('ring');
    expect(ring().classList).toContain('custom');
    expect(ring().classList.length).toBe(2);
  });
});

describe('node-run-ring.module.css', () => {
  const file = path.join(import.meta.dirname, 'node-run-ring.module.css');
  const stylesheet = postcss.parse(readFileSync(file, 'utf8'), { from: file });

  function declarations(selector: string, inReducedMotion = false) {
    const found = new Map<string, string>();
    stylesheet.walkRules(selector, (rule: Rule) => {
      const reduced = rule.parent?.type === 'atrule' && rule.parent.params.includes('prefers-reduced-motion');
      if (reduced !== inReducedMotion) return;
      rule.walkDecls((declaration) => {
        found.set(declaration.prop, declaration.value);
      });
    });
    return found;
  }

  const defaults = declarations(':root');

  it.each(TONES)('colours the %s line and halo through their public variables', (tone) => {
    const rule = declarations(`.ring[data-tone='${tone}']`);
    expect(defaults.has(`--wb-public-node-run-ring-color-${tone}`)).toBe(true);
    expect(rule.get('--ring-color')).toBe(`var(--wb-public-node-run-ring-color-${tone})`);
    expect(rule.get('--ring-halo-color')).toBe(`var(--wb-public-node-run-ring-halo-color-${tone})`);
  });

  it('defaults the halo to the DS halo on info, warning and human, and to transparent elsewhere', () => {
    const transparent = TONES.filter(
      (tone) => defaults.get(`--wb-public-node-run-ring-halo-color-${tone}`) === 'transparent',
    );
    expect(transparent).toEqual(['success', 'critical', 'neutral', 'inverse']);
  });

  it('draws the line as an inset box-shadow on an absolutely positioned layer', () => {
    expect(declarations('.ring').get('box-shadow')).toMatch(/^inset /);
    expect(declarations('.ring').get('position')).toBe('absolute');
  });

  it('keeps a static heartbeat halo and hides the waiting halo under reduced motion', () => {
    expect(declarations(".ring[data-halo='heartbeat']", true).get('animation')).toBe('none');
    expect(declarations(".ring[data-halo='heartbeat']", true).has('--ring-halo-size')).toBe(false);
    expect(declarations(".ring[data-halo='waiting']", true).get('animation')).toBe('none');
    expect(declarations(".ring[data-halo='waiting']", true).get('--ring-halo-size')).toBe('0');
  });
});
