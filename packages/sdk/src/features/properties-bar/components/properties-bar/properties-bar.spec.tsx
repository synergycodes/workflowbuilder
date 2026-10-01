import { act, fireEvent, screen } from '@testing-library/react';
import i18n from 'i18next';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import '../../../i18n/index';
import type { BuiltInControls } from '../../../ui-extensions/built-in-controls';
import { PropertiesPanelFooterContent } from '../../../ui-extensions/components/properties-panel-footer-content';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { PropertiesBar } from './properties-bar';
import type { PropertiesBarProps } from './properties-bar.types';

const node = {
  id: 'node-1',
  type: 'node',
  position: { x: 0, y: 0 },
  data: { type: 'action', icon: 'Play', properties: { label: 'Review' } },
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
const tabs: PropertiesBarProps['tabs'] = [
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

type PanelProps = Partial<PropertiesBarProps> & { initialTab: 'decision' | 'other' };

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
    act(() => useStore.getState().setIsPropertiesPanelOpen(true));
    const { rerenderPanel } = renderPanel({ initialTab: 'decision', selection: null });

    expect(screen.queryByText('Form')).toBeNull();

    rerenderPanel({ initialTab: 'decision', selection: { node, edge: null } });

    expect(screen.getByText('Form')).not.toBeNull();
  });
});

describe('PropertiesBar builtInControls', () => {
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
