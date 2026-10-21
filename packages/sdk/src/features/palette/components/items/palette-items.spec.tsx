import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PaletteGroup, PaletteItem as PaletteItemType } from '../../../../node/common';
import { filterPaletteItems } from '../../filter-palette-items';
import { PaletteItems } from './palette-items';

vi.mock('./palette-item', () => ({
  PaletteItem: ({ item }: { item: PaletteItemType }) => <div data-testid={`item-${item.type}`}>{item.label}</div>,
}));

function identityTranslate(value = '') {
  return value;
}

vi.mock('../../../../hooks/use-translate-if-possible', () => ({
  useTranslateIfPossible: () => identityTranslate,
}));

function paletteItem(type: string, label: string): PaletteItemType {
  return { type, label } as unknown as PaletteItemType;
}

function paletteGroup(label: string, groupItems: PaletteItemType[], isOpen?: boolean): PaletteGroup {
  return { label, groupItems, isOpen };
}

function renderItems(items: (PaletteItemType | PaletteGroup)[], isFiltering = false) {
  return render(<PaletteItems items={items} onDragStart={vi.fn()} onMouseDown={vi.fn()} isFiltering={isFiltering} />);
}

describe('PaletteItems', () => {
  it('renders only the items it is given', () => {
    renderItems([paletteItem('send-email', 'Send Email')]);

    expect(screen.getByTestId('item-send-email')).not.toBeNull();
    expect(screen.queryByTestId('item-wait')).toBeNull();
  });

  it('renders filtering hides non-matching items and empty groups when the caller passes the filtered subset', () => {
    const unfiltered = [
      paletteItem('top-send-email', 'Send Email'),
      paletteItem('top-wait', 'Wait'),
      paletteGroup('Actions', [paletteItem('group-send-email', 'Send Email'), paletteItem('group-wait', 'Wait')]),
      paletteGroup('Triggers', [paletteItem('trigger', 'Webhook')]),
    ];

    renderItems(
      filterPaletteItems(unfiltered, 'email', (label) => label),
      true,
    );

    expect(screen.getByTestId('item-top-send-email')).not.toBeNull();
    expect(screen.getByTestId('item-group-send-email')).not.toBeNull();
    expect(screen.queryByTestId('item-top-wait')).toBeNull();
    expect(screen.queryByTestId('item-group-wait')).toBeNull();
    expect(screen.queryByTestId('item-trigger')).toBeNull();
    expect(screen.getByText('Actions')).not.toBeNull();
    expect(screen.queryByText('Triggers')).toBeNull();
  });

  it('groups open while filtering regardless of their own isOpen', () => {
    renderItems([paletteGroup('Actions', [paletteItem('a', 'Send Email')], false)], true);

    expect(screen.getByText('Actions').closest('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('groups respect their own isOpen while not filtering', () => {
    renderItems([paletteGroup('Actions', [paletteItem('a', 'Send Email')], false)], false);

    expect(screen.getByText('Actions').closest('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false');
  });
});
