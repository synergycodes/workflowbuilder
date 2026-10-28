import { act, fireEvent, screen } from '@testing-library/react';
import i18n from 'i18next';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import type { PaletteItem, WorkflowBuilderReactFlowInstance } from '../../../../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import '../../../i18n/index';
import type { BuiltInControls } from '../../../ui-extensions/built-in-controls';
import { PropertiesPanelFooterContent } from '../../../ui-extensions/components/properties-panel-footer-content';
import { PropertiesPanelMenuItem } from '../../../ui-extensions/components/properties-panel-menu-item';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { PropertiesBar } from './properties-bar';
import type { WorkflowBuilderPropertiesPanelProps } from './properties-bar.types';

vi.mock('@workflow-builder/icons', () => ({ Icon: ({ name }: { name: string }) => <i data-icon={name} /> }));

const node = {
  id: 'node-1',
  type: 'node',
  position: { x: 0, y: 0 },
  data: { type: 'action', icon: 'Lightning', properties: { label: 'Review' } },
} as unknown as WorkflowBuilderNode;

function NodeForm() {
  return (
    <>
      <p>Form</p>
      <PropertiesPanelFooterContent>
        <button type="button">Approve</button>
      </PropertiesPanelFooterContent>
    </>
  );
}

// Custom tabs keep the node's own properties form, and its store, out of the test.
const tabs: WorkflowBuilderPropertiesPanelProps['tabs'] = [
  {
    label: 'Decision',
    value: 'decision',
    components: [{ when: ({ selectedTab }) => selectedTab === 'decision', component: () => <NodeForm /> }],
  },
  {
    label: 'Other',
    value: 'other',
    components: [{ when: ({ selectedTab }) => selectedTab === 'other', component: () => <p>Other content</p> }],
  },
];

type PanelProps = Partial<WorkflowBuilderPropertiesPanelProps> & { initialTab: 'decision' | 'other' };

function Panel({ initialTab, ...props }: PanelProps) {
  const [selectedTab, setSelectedTab] = useState<string>(initialTab);
  return (
    <PropertiesBar
      selection={{ node, edge: null }}
      headerLabel="Properties"
      deleteNodeLabel="Delete node"
      deleteEdgeLabel="Delete edge"
      tabs={tabs}
      selectedTab={selectedTab}
      onTabChange={setSelectedTab}
      {...props}
    />
  );
}

function renderPanel(props: PanelProps, builtInControls?: BuiltInControls) {
  const view = renderInRoot(<Panel {...props} />, { builtInControls });
  return { ...view, rerenderPanel: (next: PanelProps) => view.rerender(<Panel {...next} />) };
}

// Calls the action directly, bypassing the footer's own Delete button.
function DeleteSelectionButton() {
  const { deleteSelection } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={deleteSelection}>
      Delete selection
    </button>
  );
}

const footerArea = (container: HTMLElement) => container.querySelector('[class*="footer-area"]');

// The Sidebar's CSS shows its footer area, separator included, only while it matches this selector.
const isFooterShown = (container: HTMLElement) =>
  footerArea(container)?.matches(':has(> [class*="footer"] > :not(:empty))') ?? false;

const button = (name: string) => screen.queryByRole('button', { name });

beforeEach(() => {
  resetWorkflowStore();
});

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'));
  localStorage.clear();
});

describe('PropertiesBar footer', () => {
  it('shows Delete while onDeleteClick is given', () => {
    const { container } = renderPanel({ initialTab: 'other', onDeleteClick: vi.fn() });

    expect(button('Delete node')).not.toBeNull();
    expect(isFooterShown(container)).toBe(true);
  });

  it('the footer separator appears only when the footer has content', () => {
    const { container } = renderPanel({ initialTab: 'other' });

    expect(footerArea(container)!.querySelector(':scope > hr')).not.toBeNull();
    expect(isFooterShown(container)).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Decision' }));

    expect(isFooterShown(container)).toBe(true);
  });

  it('shows PropertiesPanelFooterContent from the panel content in the footer, above Delete, not in the scrolling content', () => {
    renderPanel({ initialTab: 'decision', onDeleteClick: vi.fn() });

    const footer = button('Delete node')!.parentElement!;
    expect(footer.contains(button('Approve'))).toBe(true);
    expect(footer.contains(screen.getByText('Form'))).toBe(false);
    expect(button('Approve')!.compareDocumentPosition(button('Delete node')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('shows a footer for its content alone when Delete is off', () => {
    const { container } = renderPanel({ initialTab: 'decision' });

    expect(button('Approve')).not.toBeNull();
    expect(button('Delete node')).toBeNull();
    expect(isFooterShown(container)).toBe(true);
  });

  it('content from inside a node form appears in the footer and disappears when the panel collapses or another tab is selected', () => {
    const { container } = renderPanel({ initialTab: 'decision', onDeleteClick: vi.fn() });
    expect(button('Delete node')!.parentElement!.contains(button('Approve'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Close properties bar' }));

    expect(button('Approve')).toBeNull();
    expect(button('Delete node')).toBeNull();
    expect(container.querySelectorAll('hr')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Open properties bar' }));
    expect(button('Approve')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Other' }));

    expect(button('Approve')).toBeNull();
    expect(screen.getByText('Other content')).not.toBeNull();
    expect(button('Delete node')).not.toBeNull();
  });

  it('hides the footer once its only content leaves with the tab', () => {
    const { container } = renderPanel({ initialTab: 'decision' });

    fireEvent.click(screen.getByRole('button', { name: 'Other' }));

    expect(button('Approve')).toBeNull();
    expect(isFooterShown(container)).toBe(false);
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
const renderHeader = (props: Partial<PanelProps> = {}) => renderPanel({ initialTab: 'other', tabs: [], ...props });

describe('PropertiesBar header', () => {
  beforeEach(() => {
    i18n.addResourceBundle('en', 'translation', { specNodes: { action: 'Action' } }, true, true);
    useStore.setState({ data: [actionDefinition] });
  });

  it('shows the node icon in its accent, the node label and the translated type label', () => {
    const { container } = renderHeader();

    expect(screen.getByText('Review')).not.toBeNull();
    expect(screen.getByText('Action')).not.toBeNull();
    expect(nodeIcon(container, 'Lightning')?.getAttribute('style')).toContain('--wb-public-node-icon-color-violet');
    expect(screen.queryByText('Properties')).toBeNull();
  });

  it('shows the type label, never the node description', () => {
    renderHeader(withNodeData({ properties: { label: 'Review', description: 'Checks the request' } }));

    expect(screen.getByText('Action')).not.toBeNull();
    expect(screen.queryByText('Checks the request')).toBeNull();
    expect(screen.queryByText('Runs an action')).toBeNull();
  });

  it('shows the icon saved on the node, as the canvas does, over the one of its definition', () => {
    const { container } = renderHeader();

    expect(container.querySelector('[data-icon="Lightning"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="Play"]')).toBeNull();
  });

  it('falls back to the icon of the node definition when the node has none saved', () => {
    const { container } = renderHeader(withNodeData({ icon: undefined }));

    expect(container.querySelector('[data-icon="Play"]')).not.toBeNull();
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
    expect(nodeIcon(container, 'Lightning')?.className).not.toMatch(/accent/);
  });

  it('keeps the node heading and offers to open the panel after collapsing it', () => {
    renderHeader();

    fireEvent.click(button('Close properties bar')!);

    expect(screen.getByText('Review').compareDocumentPosition(button('Open properties bar')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('shows the content again and offers to close the panel after expanding it', () => {
    renderPanel({ initialTab: 'decision' });

    fireEvent.click(button('Close properties bar')!);
    expect(screen.queryByText('Form')).toBeNull();
    fireEvent.click(button('Open properties bar')!);

    expect(screen.getByText('Form')).not.toBeNull();
    expect(button('Close properties bar')).not.toBeNull();
    expect(button('Open properties bar')).toBeNull();
  });

  it('names the panel with the header label while a node is selected', () => {
    renderHeader({ headerLabel: 'Inspector' });

    expect(screen.getByRole('region', { name: 'Inspector' }).contains(screen.getByText('Review'))).toBe(true);
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
    renderPanel({ initialTab: 'decision', selection: null, headerLabel: 'Inspector' });

    expect(screen.getByText('Inspector')).not.toBeNull();
    expect(button('Close properties bar')).toBeNull();
    expect((button('Open properties bar') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Form')).toBeNull();
  });

  it('places the menu button between the heading and the toggle', () => {
    renderInRoot(
      <>
        <PropertiesPanelMenuItem label="Approve" />
        <Panel initialTab="other" tabs={[]} />
      </>,
    );

    expect(screen.getByText('Review').compareDocumentPosition(button('Menu')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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

describe('PropertiesBar tabs', () => {
  it('the Properties tab label is translated', async () => {
    renderPanel({ initialTab: 'other' });
    expect(button('Properties')).not.toBeNull();

    await act(() => i18n.changeLanguage('pl'));

    expect(button('Właściwości')).not.toBeNull();
    expect(button('Properties')).toBeNull();
  });
});

describe('PropertiesBar open state', () => {
  it('the panel open state survives a selection change', () => {
    const otherNode = { ...node, id: 'node-2' } as unknown as WorkflowBuilderNode;
    const { rerenderPanel } = renderPanel({ initialTab: 'decision', onDeleteClick: vi.fn() });

    fireEvent.click(screen.getByRole('button', { name: /properties ?bar/i }));
    expect(button('Delete node')).toBeNull();

    rerenderPanel({ initialTab: 'decision', onDeleteClick: vi.fn(), selection: { node: otherNode, edge: null } });

    expect(button('Delete node')).toBeNull();
  });

  it('setPropertiesPanelOpen(true) with no selection shows nothing until one element is selected', () => {
    act(() => useStore.getState().setPropertiesPanelOpen(true));
    const { rerenderPanel } = renderPanel({ initialTab: 'decision', selection: null });

    expect(screen.queryByText('Form')).toBeNull();

    rerenderPanel({ initialTab: 'decision', selection: { node, edge: null } });

    expect(screen.getByText('Form')).not.toBeNull();
  });
});

describe('PropertiesBar builtInControls', () => {
  it('delete:false keeps deleteSelection working', () => {
    const deleteElements = vi.fn(async () => ({ deletedNodes: [node], deletedEdges: [] }));
    useStore.setState({
      nodes: [node],
      selectedNodesIds: [node.id],
      reactFlowInstance: { deleteElements } as unknown as WorkflowBuilderReactFlowInstance,
    });
    renderInRoot(
      <>
        <DeleteSelectionButton />
        <Panel initialTab="other" onDeleteClick={vi.fn()} />
      </>,
      { builtInControls: { delete: false } },
    );
    expect(button('Delete node')).toBeNull();

    fireEvent.click(screen.getByText('Delete selection'));

    expect(deleteElements).toHaveBeenCalledWith({ nodes: [node], edges: [] });
  });

  it('delete:false hides Delete and the footer when it was the only content; true (the default) shows it', () => {
    const { container, unmount } = renderPanel({ initialTab: 'other', onDeleteClick: vi.fn() }, { delete: false });

    expect(button('Delete node')).toBeNull();
    expect(isFooterShown(container)).toBe(false);
    unmount();

    const { container: shown } = renderPanel({ initialTab: 'other', onDeleteClick: vi.fn() }, { delete: true });

    expect(button('Delete node')).not.toBeNull();
    expect(isFooterShown(shown)).toBe(true);
  });

  it('delete:false with footer content present keeps the footer', () => {
    const { container } = renderPanel({ initialTab: 'decision', onDeleteClick: vi.fn() }, { delete: false });

    expect(button('Delete node')).toBeNull();
    expect(button('Approve')).not.toBeNull();
    expect(isFooterShown(container)).toBe(true);
  });
});
