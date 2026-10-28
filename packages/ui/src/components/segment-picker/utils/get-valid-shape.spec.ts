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

  it("returns 'circle' when every item has an explicit prefix icon", () => {
    expect(getValidShape('circle', [iconItem('a'), iconItem('b')])).toBe('circle');
  });

  it("returns 'circle' for the existing icon-child API", () => {
    expect(getValidShape('circle', [legacyIconItem('a'), legacyIconItem('b')])).toBe('circle');
  });

  it("falls back to 'default' and logs an error when an item has a label", () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(getValidShape('circle', [iconItem('a'), labelItem('b')])).toBe('default');
    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
  });
});
