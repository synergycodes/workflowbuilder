import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Hint, type HintVariant } from './hint';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

describe('Hint', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (variant: HintVariant) => act(() => root.render(<Hint variant={variant}>Some guidance</Hint>));
  const hint = () => container.querySelector<HTMLElement>('[data-hint]');
  const icon = () => container.querySelector<HTMLElement>('[data-icon]')?.dataset['icon'];

  it.each([
    ['neutral', undefined],
    ['info', 'Info'],
    ['warning', 'Warning'],
  ] as const)('the %s variant shows the text with the %s icon', (variant, expectedIcon) => {
    render(variant);

    expect(hint()?.dataset['hint']).toBe(variant);
    expect(hint()?.textContent).toBe('Some guidance');
    expect(icon()).toBe(expectedIcon);
  });

  // A switch or a new edge changes the hint in place, and a screen reader hears the new text.
  it('is a status region', () => {
    render('info');

    expect(hint()?.getAttribute('role')).toBe('status');
  });
});
