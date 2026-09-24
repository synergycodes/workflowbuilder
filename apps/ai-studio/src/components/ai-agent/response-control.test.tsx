import type { ControlProps } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uischema } from '../../nodes/ai-agent/uischema';
import { refundReviewOutputSchema } from '../../utils/ai-agent/response-options';
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
          {...({
            data,
            handleChange,
            path: 'outputSchema',
            enabled,
            label: 'Response format',
          } as unknown as ControlProps)}
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

    expect(container.textContent).toContain('Response format');
    expect(container.textContent).toContain('Plain text');
  });

  it('shows the refund review option for the seeded schema', () => {
    render({ data: refundReviewOutputSchema });

    expect(container.textContent).toContain('Structured: refund review');
  });

  it('writes the refund review schema when that option is chosen', () => {
    render();

    choose('Structured: refund review');

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('outputSchema', refundReviewOutputSchema);
  });

  it('clears the schema when plain text is chosen', () => {
    render({ data: refundReviewOutputSchema });

    choose('Plain text');

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('outputSchema', undefined);
  });

  it('writes nothing when the selected option is chosen again', () => {
    render({ data: refundReviewOutputSchema });

    choose('Structured: refund review');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('writes nothing when plain text is chosen again on a node without a schema', () => {
    render();

    choose('Plain text');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('writes nothing when plain text is chosen again on a node with a null schema', () => {
    render({ data: null });

    choose('Plain text');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('writes nothing when the preset is chosen again on a copy of it', () => {
    render({ data: structuredClone(refundReviewOutputSchema) });

    choose('Structured: refund review');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('lists only the presets for a node on a preset', () => {
    render({ data: refundReviewOutputSchema });

    click(trigger()!);

    const labels = [...document.querySelectorAll('[role="option"]')].map((option) => option.textContent);
    expect(labels).toEqual(['Plain text', 'Structured: refund review']);
  });

  describe('with a schema no preset matches', () => {
    const otherSchema = { type: 'object', properties: { score: { type: 'number' } } };

    it('shows it as a custom schema, not as plain text', () => {
      render({ data: otherSchema });

      expect(trigger()?.textContent).toContain('Structured: custom schema');
    });

    it('cannot choose the custom schema entry', () => {
      render({ data: otherSchema });

      choose('Structured: custom schema');

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('clears the schema when plain text is chosen', () => {
      render({ data: otherSchema });

      choose('Plain text');

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('outputSchema', undefined);
    });
  });

  it('is disabled when the form is read-only', () => {
    render({ enabled: false });

    const button = trigger();
    expect(button?.disabled === true || button?.getAttribute('aria-disabled') === 'true').toBe(true);
  });
});
