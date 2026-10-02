import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../../../../node/node-data';
import { PropertiesPanelFooter } from '../properties-panel-footer/properties-panel-footer';
import { PropertiesBar } from './properties-bar';
import type { PropertiesBarProps } from './properties-bar.types';

const node = {
  id: 'node-1',
  type: 'node',
  position: { x: 0, y: 0 },
  data: { type: 'action', icon: 'Play', properties: { label: 'Review' } },
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
