import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss, { type Rule } from 'postcss';

import { NodePanel } from '../node-panel/node-panel';
import type { RunStatusTone } from '../run-status-tone';
import { NodeRing } from './node-ring';

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

describe('NodeRing', () => {
  it('marks itself as a run overlay, which drops the focus ring of a selected NodePanel', () => {
    act(() =>
      root.render(
        <NodePanel.Root selected>
          <NodePanel.Overlay>
            <NodeRing tone="info" />
          </NodePanel.Overlay>
        </NodePanel.Root>,
      ),
    );

    // The selector node-panel.module.css uses to swap the focus ring for the run-status variable.
    const shell = container.querySelector('[class*="selected"]:has(> [class*="overlay"] [data-node-run-overlay])');
    expect(shell).not.toBeNull();
    const ring = container.querySelector('[data-node-run-overlay]');
    expect(ring?.getAttribute('data-tone')).toBe('info');
    expect(ring?.hasAttribute('data-halo')).toBe(false);
  });

  it('passes the halo mode to the stylesheet', () => {
    act(() => root.render(<NodeRing tone="human" halo="waiting" />));

    expect(container.firstElementChild?.getAttribute('data-halo')).toBe('waiting');
  });
});

describe('node-ring.module.css', () => {
  const file = path.join(import.meta.dirname, 'node-ring.module.css');
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

  it.each(TONES)('colours the %s ring through its public variable', (tone) => {
    expect(defaults.has(`--wb-public-node-ring-color-${tone}`)).toBe(true);
    expect(declarations(`.ring[data-tone='${tone}']`).get('--ring-color')).toBe(
      `var(--wb-public-node-ring-color-${tone})`,
    );
  });

  it('gives a halo colour only to the tones the DS defines one for', () => {
    const withHalo = TONES.filter((tone) => declarations(`.ring[data-tone='${tone}']`).has('--ring-halo-color'));
    expect(withHalo).toEqual(['info', 'warning', 'human']);
  });

  it('draws the line inset, so the ring never changes the node size', () => {
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
