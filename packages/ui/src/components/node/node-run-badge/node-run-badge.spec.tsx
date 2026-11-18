import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import badgeStyles from '../../badge-label/badge-label.module.css';
import styles from './node-run-badge.module.css';
import postcss from 'postcss';

import { RUN_STATUS_TONES } from '../run-status/run-status-tone';
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

const DS_TONES = RUN_STATUS_TONES.filter((tone) => tone !== 'inverse');

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

  const root = declarations(':root');

  it.each(RUN_STATUS_TONES)('feeds the %s colour pair into the BadgeLabel', (tone) => {
    const rule = declarations(`.badge[data-tone='${tone}']`);
    for (const part of ['background-color', 'color']) {
      expect(root.has(`--wb-public-node-run-badge-${part}-${tone}`)).toBe(true);
      expect(rule.get(`--badge-label-${part}`)).toBe(`var(--wb-public-node-run-badge-${part}-${tone})`);
    }
  });

  it.each(DS_TONES)('reads the %s colour pair from the run status tokens', (tone) => {
    expect(root.get(`--wb-public-node-run-badge-background-color-${tone}`)).toBe(
      `var(--wb-ds-canvas-run-status-bg-${tone})`,
    );
    expect(root.get(`--wb-public-node-run-badge-color-${tone}`)).toBe(`var(--wb-ds-canvas-run-status-fg-${tone})`);
  });

  it('chains the inverse colours through the BadgeLabel Inverse variables', () => {
    expect(root.get('--wb-public-node-run-badge-background-color-inverse')).toBe(
      'var(--wb-public-badge-label-background-color-inverse)',
    );
    expect(root.get('--wb-public-node-run-badge-color-inverse')).toBe('var(--wb-public-badge-label-color-inverse)');
  });
});
