import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import badgeStyles from '../../badge-label/badge-label.module.css';
import styles from './node-run-badge.module.css';
import postcss from 'postcss';

import type { RunStatusTone } from '../run-status/run-status-tone';
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

const TONES: RunStatusTone[] = ['info', 'success', 'warning', 'critical', 'human', 'neutral', 'inverse'];
const RUN_STATUS_TONES = ['success', 'warning', 'critical', 'human', 'neutral'];

describe('NodeRunBadge', () => {
  it('renders a size m BadgeLabel on the default variant, coloured by its tone', () => {
    act(() => root.render(<NodeRunBadge tone="inverse" label="Rejected" />));

    const badge = container.firstElementChild as HTMLElement;
    expect(badge.textContent).toBe('Rejected');
    expect(badge.classList).toContain(badgeStyles['m']);
    expect(badge.classList).not.toContain(badgeStyles['inverse']);
    expect(badge.dataset['tone']).toBe('inverse');
    expect(badge.classList).not.toContain(styles['dimmed']);
  });

  it('dims the label on request', () => {
    act(() => root.render(<NodeRunBadge tone="neutral" label="Skipped" dimmed />));

    expect(container.firstElementChild?.classList).toContain(styles['dimmed']);
  });
});

describe('node-run-badge.module.css', () => {
  const file = path.join(import.meta.dirname, 'node-run-badge.module.css');
  const stylesheet = postcss.parse(readFileSync(file, 'utf8'), { from: file });

  function declarations(selector: string) {
    const found = new Map<string, string>();
    stylesheet.walkRules(selector, (rule) => {
      rule.walkDecls((declaration) => {
        found.set(declaration.prop, declaration.value);
      });
    });
    return found;
  }

  const light = declarations(':root');
  const dark = declarations(":root[data-theme='dark']");

  it.each(TONES)('feeds the %s colour pair into the BadgeLabel', (tone) => {
    const rule = declarations(`.badge[data-tone='${tone}']`);
    for (const part of ['background-color', 'color', 'icon-color']) {
      expect(light.has(`--wb-public-node-run-badge-${part}-${tone}`)).toBe(true);
      expect(rule.get(`--badge-label-${part}`)).toBe(`var(--wb-public-node-run-badge-${part}-${tone})`);
    }
  });

  it.each(['info', 'inverse'])('chains the %s colours through the BadgeLabel public variables', (tone) => {
    const suffix = tone === 'inverse' ? '-inverse' : '';
    for (const part of ['background-color', 'color', 'icon-color']) {
      expect(light.get(`--wb-public-node-run-badge-${part}-${tone}`)).toBe(
        `var(--wb-public-badge-label-${part}${suffix})`,
      );
    }
  });

  it.each(RUN_STATUS_TONES)('gives the %s text colour a Dark value', (tone) => {
    expect(dark.has(`--wb-public-node-run-badge-color-${tone}`)).toBe(true);
  });
});
