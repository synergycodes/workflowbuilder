import { describe, expect, it } from 'vitest';

import { composeMenuItems } from './compose-menu-items';
import type { RegisteredMenuItem } from './ui-extension-registry';

function registeredItem(overrides: Partial<RegisteredMenuItem> = {}): RegisteredMenuItem {
  return { id: 'item-1', label: 'Item', ...overrides };
}

describe('composeMenuItems', () => {
  it('returns an empty array when both sides are empty', () => {
    expect(composeMenuItems([], [])).toEqual([]);
  });

  it('returns only the built-ins, unchanged, when there are no registered items', () => {
    const builtIns = [{ label: 'Export' }, { label: 'Import' }];

    expect(composeMenuItems(builtIns, [])).toEqual(builtIns);
  });

  it('returns only the registered items, ids dropped, when there are no built-ins', () => {
    const registered = [registeredItem({ id: 'a', label: 'First' }), registeredItem({ id: 'b', label: 'Second' })];

    expect(composeMenuItems([], registered)).toEqual([{ label: 'First' }, { label: 'Second' }]);
  });

  it('puts built-ins first, then one separator, then registered items with their ids dropped', () => {
    const builtIns = [{ label: 'Export' }];
    const registered = [registeredItem({ id: 'a', label: 'Custom', tone: 'critical', disabled: true })];

    expect(composeMenuItems(builtIns, registered)).toEqual([
      { label: 'Export' },
      { type: 'separator' },
      { label: 'Custom', tone: 'critical', disabled: true },
    ]);
  });
});
