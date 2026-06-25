import { type ReactElement, createElement } from 'react';
import { vi } from 'vitest';

import { Item, type SegmentPickerItemProps } from '../item/segment-picker-item';
import { getValidShape } from './get-valid-shape';

type PickerItem = ReactElement<SegmentPickerItemProps, typeof Item>;

const icon = createElement('svg');

// `SegmentPickerItemProps` requires `children` in props, so the guards read
// `item.props.children` — pass it as a prop rather than a createElement arg.
function iconItem(value: string): PickerItem {
  // eslint-disable-next-line react/no-children-prop
  return createElement(Item, { value, children: icon }) as PickerItem;
}

function labelItem(value: string): PickerItem {
  // eslint-disable-next-line react/no-children-prop
  return createElement(Item, { value, children: 'label' }) as PickerItem;
}

describe('getValidShape', () => {
  it("returns 'default' unchanged without inspecting items", () => {
    expect(getValidShape('default', [labelItem('a')])).toBe('default');
  });

  it("returns 'circle' when every item has icon-only children", () => {
    expect(getValidShape('circle', [iconItem('a'), iconItem('b')])).toBe('circle');
  });

  it("falls back to 'default' and logs an error when an item has a string child", () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(getValidShape('circle', [iconItem('a'), labelItem('b')])).toBe('default');
    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
  });
});
