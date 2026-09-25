import { useStore } from '@workflowbuilder/sdk';
import type { ControlProps, PaletteItem } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The editor's real panel, so the control runs with the tester, validator and store AI Studio gives it.
import { registerCustomRenderers } from '../../../../../packages/sdk/src/features/json-form/extension-registry';
import { NodeProperties } from '../../../../../packages/sdk/src/features/properties-bar/components/node-properties/node-properties';
import { aiAgentPaletteItem } from '../../nodes/ai-agent';
import { uischema } from '../../nodes/ai-agent/uischema';
import { refundReviewOutputSchema } from '../../utils/ai-agent/response-options';
import { ResponseControl, responseControlRenderer } from './response-control';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

registerCustomRenderers([responseControlRenderer]);

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

  it('lists the custom schema entry on a node on a preset too, so the list never changes length', () => {
    render({ data: refundReviewOutputSchema });

    click(trigger()!);

    const labels = [...document.querySelectorAll('[role="option"]')].map((option) => option.textContent);
    expect(labels).toEqual(['Plain text', 'Structured: refund review', 'Structured: custom schema']);
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

  it('is disabled when enabled is false', () => {
    render({ enabled: false });

    const button = trigger();
    expect(button?.disabled === true || button?.getAttribute('aria-disabled') === 'true').toBe(true);
  });
});

const storedProperties = () => useStore.getState().nodes[0]?.data.properties;
const propertiesOf = (id: string) => useStore.getState().nodes.find((node) => node.id === id)?.data.properties;

const aiAgentNode = (id: string, properties: Record<string, unknown>) => ({
  id,
  position: { x: 0, y: 0 },
  data: {
    type: aiAgentPaletteItem.type,
    icon: aiAgentPaletteItem.icon,
    properties: { ...aiAgentPaletteItem.defaultPropertiesData, ...properties },
  },
});

// JsonForms reports a change after a short debounce; the node data follows that report.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

describe('the Response format in the properties panel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  const renderPanel = (properties: Record<string, unknown>, isReadOnlyMode = false) => {
    const node = aiAgentNode('draft-1', properties);
    act(() => useStore.setState({ data: [aiAgentPaletteItem as PaletteItem], nodes: [node], isReadOnlyMode }));
    act(() => root.render(<NodeProperties node={node} />));
  };

  const trigger = () => container.querySelector<HTMLButtonElement>('[role="combobox"]');
  // Clicking another node on the canvas closes the list, so the node switch meets it still mounted.
  const openList = () => click(trigger()!);

  const choose = async (label: string) => {
    click(trigger()!);
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes(label),
    );
    click(option!);
    await settle();
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await settle();
    act(() => root.unmount());
    container.remove();
    useStore.setState({ data: [], nodes: [], isReadOnlyMode: false });
  });

  it('renders the node uischema element with this control', () => {
    renderPanel({});

    expect(trigger()?.textContent).toContain('Plain text');
  });

  it('writes the preset to the node, and the node schema accepts it', async () => {
    renderPanel({});

    await choose('Structured: refund review');

    expect(storedProperties()?.['outputSchema']).toEqual(refundReviewOutputSchema);
    expect(storedProperties()?.errors).toEqual([]);
  });

  it('removes the key from the node when plain text is chosen', async () => {
    renderPanel({ outputSchema: refundReviewOutputSchema });

    await choose('Plain text');

    expect(storedProperties()).not.toHaveProperty('outputSchema');
  });

  it('leaves the node untouched when the preset is chosen again on a copy of it', async () => {
    renderPanel({ outputSchema: structuredClone(refundReviewOutputSchema) });
    const nodes = useStore.getState().nodes;

    await choose('Structured: refund review');

    expect(useStore.getState().nodes).toBe(nodes);
  });

  it('is disabled in read-only mode', () => {
    renderPanel({}, true);

    const button = trigger();
    expect(button?.disabled === true || button?.getAttribute('aria-disabled') === 'true').toBe(true);
  });

  describe('beside a node whose schema no preset matches', () => {
    const custom = aiAgentNode('custom-1', { outputSchema: { type: 'object', properties: { score: {} } } });
    const preset = aiAgentNode('preset-1', { outputSchema: refundReviewOutputSchema });
    const text = aiAgentNode('text-1', {});

    // The properties bar renders NodeProperties without a key, so selecting another node reuses the control.
    const select = (node: typeof custom) => act(() => root.render(<NodeProperties node={node} />));

    beforeEach(() => {
      act(() => useStore.setState({ data: [aiAgentPaletteItem as PaletteItem], nodes: [custom, preset, text] }));
    });

    it('keeps the preset chosen on the custom node', async () => {
      select(custom);

      await choose('Structured: refund review');

      expect(propertiesOf('custom-1')?.['outputSchema']).toEqual(refundReviewOutputSchema);
    });

    it('leaves the next node alone when the panel switches away from the custom node with its list open', async () => {
      select(custom);
      openList();

      select(preset);
      await settle();

      expect(propertiesOf('preset-1')?.['outputSchema']).toBe(refundReviewOutputSchema);
    });

    it('writes no schema onto a plain-text node shown after a preset node and the custom one with its list open', async () => {
      select(preset);
      select(custom);
      openList();

      select(text);
      await settle();

      expect(propertiesOf('text-1')).not.toHaveProperty('outputSchema');
    });
  });
});
