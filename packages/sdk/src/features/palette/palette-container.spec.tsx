import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setCustomPaletteNodes } from '../../data/palette';
import { useWorkflowBuilderActions } from '../../hooks/use-workflow-builder-actions';
import type { PaletteGroup, PaletteItem } from '../../node/common';
import { resetWorkflowStore, useStore } from '../../store/store';
import '../i18n/index';
import { renderInRoot } from '../ui-extensions/test-utils';
import { PaletteContainer } from './palette-container';

// The node preview needs a full node definition; the filter only reads `type` and `label`.
vi.mock('./components/items/palette-item', () => ({
  PaletteItem: ({ item }: { item: PaletteItem }) => <div data-testid={`item-${item.type}`}>{item.label}</div>,
}));

function paletteItem(type: string, label: string): PaletteItem {
  return { type, label } as unknown as PaletteItem;
}

function paletteGroup(label: string, groupItems: PaletteItem[], isOpen?: boolean): PaletteGroup {
  return { label, groupItems, isOpen };
}

function FilterButton({ query }: { query: string }) {
  const { setPaletteFilter } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={() => setPaletteFilter(query)}>
      Filter
    </button>
  );
}

function groupExpanded(label: string) {
  return screen.getByText(label).closest('[aria-expanded]')?.getAttribute('aria-expanded');
}

beforeEach(() => {
  setCustomPaletteNodes([
    paletteItem('top-send-email', 'Send Email'),
    paletteItem('top-wait', 'Wait'),
    paletteGroup('Actions', [paletteItem('group-send-email', 'Send Email'), paletteItem('group-wait', 'Wait')], false),
    paletteGroup('Triggers', [paletteItem('trigger', 'Webhook')], true),
  ]);
  resetWorkflowStore();
  useStore.setState({ isPaletteOpen: true });
});

afterEach(() => {
  setCustomPaletteNodes(null);
  resetWorkflowStore();
});

describe('PaletteContainer filtering', () => {
  it('setPaletteFilter hides the non-matching items and empty groups, and expands the groups left', () => {
    renderInRoot(
      <>
        <FilterButton query="email" />
        <PaletteContainer />
      </>,
    );
    expect(screen.getByTestId('item-top-wait')).not.toBeNull();
    expect(screen.getByText('Triggers')).not.toBeNull();
    expect(groupExpanded('Actions')).toBe('false');

    fireEvent.click(screen.getByText('Filter'));

    expect(screen.getByTestId('item-top-send-email')).not.toBeNull();
    expect(screen.getByTestId('item-group-send-email')).not.toBeNull();
    expect(screen.queryByTestId('item-top-wait')).toBeNull();
    expect(screen.queryByTestId('item-group-wait')).toBeNull();
    expect(screen.queryByTestId('item-trigger')).toBeNull();
    expect(screen.queryByText('Triggers')).toBeNull();
    expect(groupExpanded('Actions')).toBe('true');
  });

  it('clearing the filter brings every item back and leaves the node data untouched', () => {
    renderInRoot(
      <>
        <FilterButton query="email" />
        <PaletteContainer />
      </>,
    );
    fireEvent.click(screen.getByText('Filter'));
    expect(screen.queryByTestId('item-top-wait')).toBeNull();

    act(() => useStore.getState().setPaletteFilter(''));

    expect(screen.getByTestId('item-top-wait')).not.toBeNull();
    expect(useStore.getState().getNodeDefinition('top-wait')?.label).toBe('Wait');
  });
});
