import type { ControlProps } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { refundReviewOutputSchema } from '../../nodes/ai-agent/response-options';
import { uischema } from '../../nodes/ai-agent/uischema';
import { ResponseControl, responseControlRenderer } from './response-control';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Base UI opens and selects on the pointer sequence, not on `click` alone.
const click = (element: Element) =>
  act(() => {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    }
    (element as HTMLElement).click();
  });

describe('ResponseControl', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const handleChange = vi.fn();

  const render = ({ data, enabled = true }: { data?: unknown; enabled?: boolean } = {}) =>
    act(() =>
      root.render(
        <ResponseControl
          {...({ data, handleChange, path: 'outputSchema', enabled, label: 'Response' } as unknown as ControlProps)}
        />,
      ),
    );

  beforeEach(() => {
    handleChange.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const trigger = () => container.querySelector('button');
  const choose = (label: string) => {
    click(trigger()!);
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes(label),
    );
    click(option!);
  };

  // The element on the node and the tester that claims it are written apart; a rename of one is silent.
  it('claims exactly one element of the node uischema', () => {
    const elements = (uischema as unknown as { elements: unknown[] }).elements;
    const ranks = elements.map((element) => responseControlRenderer.tester(element as never, {} as never, {} as never));

    expect(ranks.filter((rank) => rank > 0)).toHaveLength(1);
  });

  it('shows plain text for a node without an output schema', () => {
    render();

    expect(container.textContent).toContain('Response');
    expect(container.textContent).toContain('Plain text');
  });

  it('shows the refund review option for the seeded schema', () => {
    render({ data: refundReviewOutputSchema });

    expect(container.textContent).toContain('Structured: refund review');
  });

  it('writes the refund review schema when that option is chosen', () => {
    render();

    choose('Structured: refund review');

    expect(handleChange).toHaveBeenCalledWith('outputSchema', refundReviewOutputSchema);
  });

  it('clears the schema when plain text is chosen', () => {
    render({ data: refundReviewOutputSchema });

    choose('Plain text');

    expect(handleChange.mock.lastCall).toEqual(['outputSchema', undefined]);
  });

  it('is disabled when the form is read-only', () => {
    render({ enabled: false });

    const button = trigger();
    expect(button?.disabled === true || button?.getAttribute('aria-disabled') === 'true').toBe(true);
  });
});
