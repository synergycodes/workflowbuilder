import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import styles from './node-footer.module.css';
import postcss from 'postcss';

import { RUN_STATUS_TONES } from '../run-status/run-status-tone';
import { throughPalette } from '../run-status/test-utils';
import { NodeFooter } from './node-footer';

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

describe('NodeFooter', () => {
  it('renders the message in Label S with its tone and no icon or actions by default', () => {
    act(() => root.render(<NodeFooter tone="human" message="Decision needed" />));

    const footer = container.firstElementChild as HTMLElement;
    expect(footer.dataset['tone']).toBe('human');
    expect(footer.textContent).toBe('Decision needed');
    expect(footer.querySelector('.wb-text-label-s')).not.toBeNull();
    expect(footer.querySelector(`.${styles['icon']}`)).toBeNull();
    expect(footer.querySelector(`.${styles['actions']}`)).toBeNull();
  });

  it('sets size m in Body S and renders the icon and actions', () => {
    act(() =>
      root.render(
        <NodeFooter tone="critical" message="Step failed" size="m" icon={<svg data-testid="icon" />}>
          <button>Fix</button>
        </NodeFooter>,
      ),
    );

    const footer = container.firstElementChild as HTMLElement;
    expect(footer.querySelector('.wb-text-body-s')).not.toBeNull();
    expect(footer.querySelector(`.${styles['icon']} [data-testid="icon"]`)).not.toBeNull();
    expect(footer.querySelector(`.${styles['actions']} button`)?.textContent).toBe('Fix');
  });
});

describe('node-footer.module.css', () => {
  const file = path.join(import.meta.dirname, 'node-footer.module.css');
  const stylesheet = postcss.parse(readFileSync(file, 'utf8'), { from: file });
  const variables = new Map<string, string>();
  stylesheet.walkRules(':root', (rule) => {
    rule.walkDecls((declaration) => {
      variables.set(declaration.prop, declaration.value);
    });
  });

  it.each(RUN_STATUS_TONES.filter((tone) => tone !== 'inverse'))(
    'colours the %s footer with the DS run status fg token',
    (tone) => {
      let colour: string | undefined;
      stylesheet.walkRules(`.footer[data-tone='${tone}']`, (rule) =>
        rule.walkDecls('--footer-color', (declaration) => {
          colour = declaration.value;
        }),
      );
      expect(colour).toBe(`var(--wb-public-node-footer-color-${tone})`);
      expect(throughPalette(variables.get(`--wb-public-node-footer-color-${tone}`))).toBe(
        `var(--wb-ds-canvas-run-status-fg-${tone})`,
      );
    },
  );
});
