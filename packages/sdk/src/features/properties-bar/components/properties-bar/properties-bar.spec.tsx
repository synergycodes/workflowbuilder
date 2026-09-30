import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaletteItem } from '../../../../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../../node/node-data';
import { useStore } from '../../../../store/store';
import '../../../i18n/index';
import { PropertiesPanelFooter } from '../properties-panel-footer/properties-panel-footer';
import { PropertiesBar } from './properties-bar';
import type { PropertiesBarProps } from './properties-bar.types';

vi.mock('@workflow-builder/icons', () => ({ Icon: ({ name }: { name: string }) => <i data-icon={name} /> }));

const node = {
  id: 'node-1',
  type: 'node',
  position: { x: 0, y: 0 },
  data: { type: 'action', icon: 'Lightning', properties: { label: 'Review' } },
} as unknown as WorkflowBuilderNode;

function Decision() {
  return (
    <>
      <p>Form</p>
      <PropertiesPanelFooter>
        <button type="button">Approve</button>
      </PropertiesPanelFooter>
    </>
  );
}

// A custom tab keeps the node's own properties form, and its store, out of the test.
function renderBar({ withContent, ...props }: Partial<PropertiesBarProps> & { withContent: boolean }) {
  const barProps: PropertiesBarProps = {
    selection: { node, edge: null },
    selectedTab: 'custom',
    onTabChange: vi.fn(),
    headerLabel: 'Properties',
    deleteNodeLabel: 'Delete node',
    deleteEdgeLabel: 'Delete edge',
    tabs: [
      { label: 'Custom', value: 'custom', components: [{ when: () => withContent, component: () => <Decision /> }] },
    ],
    ...props,
  };
  const bar = (current: PropertiesBarProps) => (
    <StrictMode>
      <PropertiesBar {...current} />
    </StrictMode>
  );
  const view = render(bar(barProps));
  return { ...view, rerenderBar: (next: Partial<PropertiesBarProps>) => view.rerender(bar({ ...barProps, ...next })) };
}

// The sidebar draws one separator under the header, and one more above a footer.
const hasFooter = (container: HTMLElement) => container.querySelectorAll('hr').length === 2;

const button = (name: string) => screen.queryByRole('button', { name });

describe('PropertiesBar footer', () => {
  it('shows Delete while onDeleteClick is given', () => {
    const { container } = renderBar({ withContent: false, onDeleteClick: vi.fn() });

    expect(button('Delete node')).not.toBeNull();
    expect(hasFooter(container)).toBe(true);
  });

  it('has no footer without onDeleteClick and without footer content', () => {
    const { container } = renderBar({ withContent: false });

    expect(button('Delete node')).toBeNull();
    expect(hasFooter(container)).toBe(false);
  });

  it('shows PropertiesPanelFooter content in the footer, above Delete, not in the scrolling content', () => {
    renderBar({ withContent: true, onDeleteClick: vi.fn() });

    const footer = button('Delete node')!.parentElement!;
    expect(footer.contains(button('Approve'))).toBe(true);
    expect(footer.contains(screen.getByText('Form'))).toBe(false);
    expect(button('Approve')!.compareDocumentPosition(button('Delete node')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('shows a footer for its content alone when Delete is off', () => {
    const { container } = renderBar({ withContent: true });

    expect(button('Approve')).not.toBeNull();
    expect(button('Delete node')).toBeNull();
    expect(hasFooter(container)).toBe(true);
  });

  it('has no footer while the panel is collapsed', () => {
    const { container } = renderBar({ withContent: true, onDeleteClick: vi.fn() });

    fireEvent.click(screen.getByRole('button', { name: /properties ?bar/i }));

    expect(button('Approve')).toBeNull();
    expect(button('Delete node')).toBeNull();
    expect(container.querySelectorAll('hr')).toHaveLength(0);
  });

  it('drops the footer once its content is gone', () => {
    const { container, rerenderBar } = renderBar({ withContent: true });

    rerenderBar({ tabs: [{ label: 'Custom', value: 'custom', components: [] }] });

    expect(button('Approve')).toBeNull();
    expect(hasFooter(container)).toBe(false);
  });
});

const actionDefinition = {
  type: 'action',
  icon: 'Play',
  accent: 'violet',
  label: 'specNodes.action',
  description: 'Runs an action',
} as unknown as PaletteItem;

function edge(label?: string): WorkflowBuilderEdge {
  return { id: 'edge-1', source: 'node-1', target: 'node-2', data: { label } };
}

const nodeIcon = (container: HTMLElement, name = 'Play') =>
  container.querySelector(`[data-icon="${name}"]`)?.parentElement;

const withNodeData = (data: Partial<WorkflowBuilderNode['data']>) => ({
  selection: { node: { ...node, data: { ...node.data, ...data } }, edge: null },
});

// Without tabs the header has no segment picker, whose first item also reads "Properties".
const renderHeader = (props: Partial<PropertiesBarProps> = {}) => renderBar({ withContent: false, tabs: [], ...props });

describe('PropertiesBar header', () => {
  beforeEach(() => {
    i18n.addResourceBundle('en', 'translation', { specNodes: { action: 'Action' } }, true, true);
    useStore.setState({ data: [actionDefinition] });
  });

  afterEach(() => {
    cleanup();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('shows the node icon in its accent, the node label and the translated type label', () => {
    const { container } = renderHeader();

    expect(screen.getByText('Review')).not.toBeNull();
    expect(screen.getByText('Action')).not.toBeNull();
    expect(nodeIcon(container)?.getAttribute('style')).toContain('--wb-public-node-icon-color-violet');
    expect(screen.queryByText('Properties')).toBeNull();
  });

  it('shows the type label, never the node description', () => {
    renderHeader(withNodeData({ properties: { label: 'Review', description: 'Checks the request' } }));

    expect(screen.getByText('Action')).not.toBeNull();
    expect(screen.queryByText('Checks the request')).toBeNull();
    expect(screen.queryByText('Runs an action')).toBeNull();
  });

  it('prefers the icon of the node definition over the one saved on the node', () => {
    const { container } = renderHeader();

    expect(nodeIcon(container)).toBeDefined();
    expect(nodeIcon(container, 'Lightning')).toBeUndefined();
  });

  it('titles a node without a label with its type label, without a subtitle', () => {
    renderHeader(withNodeData({ properties: {} }));

    expect(screen.getAllByText('Action')).toHaveLength(1);
  });

  it('titles an unlabelled node of an unknown type with its type and shows its saved icon', () => {
    useStore.setState({ data: [] });
    const { container } = renderHeader(withNodeData({ properties: {} }));

    expect(screen.getByText('action')).not.toBeNull();
    expect(screen.queryByText('Properties')).toBeNull();
    expect(nodeIcon(container, 'Lightning')?.className).not.toMatch(/accent-/);
  });

  it('keeps the node heading and offers to open the panel after collapsing it', () => {
    renderHeader();

    fireEvent.click(button('Close properties bar')!);

    expect(screen.getByText('Review').compareDocumentPosition(button('Open properties bar')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('names the panel with the header label while a node is selected', () => {
    renderHeader();

    expect(screen.getByRole('region', { name: 'Properties' }).contains(screen.getByText('Review'))).toBe(true);
  });

  it('shows the icon of a selected edge in place of the default arrow', () => {
    const { container } = renderHeader({
      selection: { node: null, edge: { ...edge(), data: { label: 'Approved', icon: 'Check' } } },
    });

    expect(container.querySelector('[data-icon="Check"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="CaretRight"]')).toBeNull();
  });

  it('shows the label of a selected edge with an icon and the Link subtitle', () => {
    const { container } = renderHeader({ selection: { node: null, edge: edge('Approved') } });

    expect(screen.getByText('Approved')).not.toBeNull();
    expect(screen.getByText('Link')).not.toBeNull();
    expect(container.querySelector('[data-icon="CaretRight"]')).not.toBeNull();
    expect(screen.queryByText('Properties')).toBeNull();
  });

  it('titles an edge without a label Link', () => {
    renderHeader({ selection: { node: null, edge: edge() } });

    expect(screen.getAllByText('Link')).toHaveLength(2);
    expect(screen.queryByText('Properties')).toBeNull();
  });

  it('shows the header label, no content and a disabled Open toggle while nothing is selected', () => {
    renderBar({ withContent: true, selection: null });

    expect(screen.getByText('Properties')).not.toBeNull();
    expect(button('Close properties bar')).toBeNull();
    expect((button('Open properties bar') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Form')).toBeNull();
  });

  it('has a menu button only with onMenuHeaderClick, left of the toggle', () => {
    const onMenuHeaderClick = vi.fn();
    const { rerenderBar } = renderHeader();
    expect(button('Menu')).toBeNull();

    rerenderBar({ onMenuHeaderClick });
    fireEvent.click(button('Menu')!);

    expect(onMenuHeaderClick).toHaveBeenCalledOnce();
    expect(button('Menu')!.compareDocumentPosition(button('Close properties bar')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('exposes a long node label in full as a title', () => {
    const label = 'A node label far too long to fit on a single line of the properties panel header';
    renderHeader({ selection: { node: { ...node, data: { ...node.data, properties: { label } } }, edge: null } });

    expect(screen.getByText(label).getAttribute('title')).toBe(label);
  });
});

describe('PropertiesPanelFooter', () => {
  it('renders nothing outside the properties panel', () => {
    render(
      <PropertiesPanelFooter>
        <button type="button">Approve</button>
      </PropertiesPanelFooter>,
    );

    expect(button('Approve')).toBeNull();
  });
});
