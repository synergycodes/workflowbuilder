import { type ReactElement, createElement } from 'react';
import { vi } from 'vitest';

import { Item, type SegmentPickerItemProps } from '../item/segment-picker-item';
import { getValidShape } from './get-valid-shape';

type PickerItem = ReactElement<SegmentPickerItemProps, typeof Item>;

const icon = createElement('svg');

function iconItem(value: string): PickerItem {
  return createElement(Item, { value, prefixIcon: icon }) as PickerItem;
}

function legacyIconItem(value: string): PickerItem {
  return createElement(Item, { value }, icon) as PickerItem;
}

function labelItem(value: string): PickerItem {
  return createElement(Item, { value }, 'label') as PickerItem;
}

describe('getValidShape', () => {
  it("returns 'default' unchanged without inspecting items", () => {
    expect(getValidShape('default', [labelItem('a')])).toBe('default');
  });

  it("returns 'round' when every item has an explicit prefix icon", () => {
    expect(getValidShape('round', [iconItem('a'), iconItem('b')])).toBe('round');
  });

  it("returns 'round' for the existing icon-child API", () => {
    expect(getValidShape('round', [legacyIconItem('a'), legacyIconItem('b')])).toBe('round');
  });

  it("falls back to 'default' and logs an error when an item has a label", () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(getValidShape('round', [iconItem('a'), labelItem('b')])).toBe('default');
    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
  });
});
