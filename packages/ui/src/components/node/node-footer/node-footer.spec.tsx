import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import styles from './node-footer.module.css';

import { NODE_RUN_TONES } from '../run-status/run-status-tone';
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
    expect(footer.querySelector(`.${styles['s']}`)).not.toBeNull();
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
    expect(footer.querySelector(`.${styles['m']}`)).not.toBeNull();
    expect(footer.querySelector(`.${styles['icon']} [data-testid="icon"]`)).not.toBeNull();
    expect(footer.querySelector(`.${styles['actions']} button`)?.textContent).toBe('Fix');
  });

  it.each(NODE_RUN_TONES)('colours the %s footer with the DS run status fg token', (tone) => {
    act(() => root.render(<NodeFooter tone={tone} message="Status" />));

    const footer = container.firstElementChild as HTMLElement;
    expect(throughPalette(footer.style.getPropertyValue('--footer-color'))).toBe(
      `var(--wb-ds-canvas-run-status-fg-${tone})`,
    );
  });

  it('reads a custom tone from its own fg variable with the neutral fallback', () => {
    act(() => root.render(<NodeFooter tone="escalated" message="Escalated" />));

    const footer = container.firstElementChild as HTMLElement;
    expect(footer.style.getPropertyValue('--footer-color')).toBe(
      'var(--wb-public-node-run-status-fg-escalated, var(--wb-public-node-run-status-fg-neutral))',
    );
  });
});
