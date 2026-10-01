import type { PaletteGroup, PaletteItem } from '../../node/common';
import { filterPaletteItems } from './filter-palette-items';

function paletteItem(type: string, label: string): PaletteItem {
  return { type, label } as unknown as PaletteItem;
}

function paletteGroup(label: string, groupItems: PaletteItem[]): PaletteGroup {
  return { label, groupItems };
}

const identityTranslate = (label: string) => label;

function translateSendEmail(label: string) {
  return label === 'Send Email' ? 'Wyślij e-mail' : label;
}

describe('filterPaletteItems', () => {
  it('returns the same array for an empty query', () => {
    const items = [paletteItem('a', 'Alpha')];

    expect(filterPaletteItems(items, '', identityTranslate)).toBe(items);
  });

  it('returns the same array for a whitespace-only query', () => {
    const items = [paletteItem('a', 'Alpha')];

    expect(filterPaletteItems(items, '   ', identityTranslate)).toBe(items);
  });

  it('matches the translated label case-insensitively', () => {
    const items = [paletteItem('a', 'Send Email'), paletteItem('b', 'Wait')];

    const result = filterPaletteItems(items, 'E-MAIL', translateSendEmail);

    expect(result).toEqual([items[0]]);
  });

  it('hides a group with no matching item and keeps a group with one', () => {
    const matching = paletteItem('match', 'Send Email');
    const groups = [
      paletteGroup('Actions', [matching, paletteItem('other', 'Wait')]),
      paletteGroup('Triggers', [paletteItem('trigger', 'Webhook')]),
    ];

    const result = filterPaletteItems(groups, 'email', identityTranslate);

    expect(result).toHaveLength(1);
    expect((result[0] as PaletteGroup).label).toBe('Actions');
    expect((result[0] as PaletteGroup).groupItems).toEqual([matching]);
  });

  it('does not touch the item definitions (same object identity for kept items)', () => {
    const topLevelItem = paletteItem('top', 'Send Email');
    const groupedItem = paletteItem('grouped', 'Send Email');
    const items = [topLevelItem, paletteGroup('Actions', [groupedItem, paletteItem('other', 'Wait')])];

    const result = filterPaletteItems(items, 'email', identityTranslate);

    expect(result[0]).toBe(topLevelItem);
    expect((result[1] as PaletteGroup).groupItems[0]).toBe(groupedItem);
  });

  it('does not match against the group label, only item labels', () => {
    const groups = [paletteGroup('Email Actions', [paletteItem('a', 'Wait')])];

    const result = filterPaletteItems(groups, 'email', identityTranslate);

    expect(result).toHaveLength(0);
  });
});
