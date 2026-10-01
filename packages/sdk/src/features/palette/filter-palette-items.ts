import type { PaletteGroup, PaletteItem, PaletteItemOrGroup } from '../../node/common';

function isPaletteGroup(itemOrGroup: PaletteItemOrGroup): itemOrGroup is PaletteGroup {
  return Array.isArray((itemOrGroup as PaletteGroup).groupItems);
}

function matchesQuery(item: PaletteItem, query: string, translate: (label: string) => string): boolean {
  return translate(item.label).toLowerCase().includes(query.trim().toLowerCase());
}

/**
 * Filters palette items and groups by a case-insensitive "contains" match on
 * each item's translated label. Group labels are never matched; a group is
 * kept (with only its matching items) when at least one of its items
 * matches, and dropped otherwise. Returns `items` itself, unchanged, for an
 * empty (or whitespace-only) `query`.
 */
export function filterPaletteItems(
  items: PaletteItemOrGroup[],
  query: string,
  translate: (label: string) => string,
): PaletteItemOrGroup[] {
  if (query.trim() === '') {
    return items;
  }

  return items.reduce<PaletteItemOrGroup[]>((matched, itemOrGroup) => {
    if (isPaletteGroup(itemOrGroup)) {
      const matchingGroupItems = itemOrGroup.groupItems.filter((item) => matchesQuery(item, query, translate));

      if (matchingGroupItems.length > 0) {
        matched.push({ ...itemOrGroup, groupItems: matchingGroupItems });
      }

      return matched;
    }

    if (matchesQuery(itemOrGroup, query, translate)) {
      matched.push(itemOrGroup);
    }

    return matched;
  }, []);
}
