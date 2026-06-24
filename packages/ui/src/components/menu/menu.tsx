import { Menu as MenuBase } from '@base-ui/react/menu';
import { Separator } from '@ui/components/separator/separator';
import { ItemSize } from '@ui/shared/types/item-size';
import clsx from 'clsx';
import { type ComponentProps, ReactElement, memo } from 'react';

import listBoxStyles from '@ui/shared/styles/list-box.module.css';

import { MenuItem } from './menu-item';
import { MenuItemProps } from './types';

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'end';

export type Placement = Side | `${Side}-${Align}`;

type OffsetAxes = {
  mainAxis?: number;
  crossAxis?: number;
  alignmentAxis?: number | null;
};

export type OffsetOptions = number | OffsetAxes;

export type MenuProps = {
  /**
   * Array of menu items to be rendered in the menu.
   * Each item can be either a regular menu item or a separator.
   */
  items: MenuItemProps[];

  /**
   * Size variant for the menu items.
   * @default 'medium'
   */
  size?: ItemSize;

  /**
   * The preferred placement of the menu relative to its trigger element.
   * Uses Floating UI placement options.
   * @default 'bottom-end'
   */
  placement?: Placement | undefined;

  /**
   * Controls whether the menu is open or closed.
   * When omitted, the menu's open state will be managed internally
   * and toggled by clicking on the `children` trigger element.
   */
  open?: boolean | undefined;

  /**
   * Callback fired when the component requests to be opened or closed.
   * Receives the next open state and the native event that triggered the
   * change (if any).
   */
  onOpenChange?: (open: boolean, event?: Event) => void;

  /**
   * Distance between a popup and the trigger element
   */
  offset?: OffsetOptions;
  /**
   * The trigger element that will open the menu when clicked.
   * This element will be wrapped in a button with appropriate ARIA attributes.
   */
  children?: ReactElement;
};

type PositionerProps = ComponentProps<typeof MenuBase.Positioner>;
type PositionerSide = NonNullable<PositionerProps['side']>;
type PositionerAlign = NonNullable<PositionerProps['align']>;

function placementToSideAlign(placement: Placement): {
  side: PositionerSide;
  align: PositionerAlign;
} {
  const [side, alignRaw] = placement.split('-') as [PositionerSide, PositionerAlign | undefined];
  return { side, align: alignRaw ?? 'center' };
}

function offsetToBaseUI(
  offset: OffsetOptions | undefined,
  align: PositionerAlign,
): { sideOffset?: number; alignOffset?: number } {
  if (offset == null) return {};
  if (typeof offset === 'number') return { sideOffset: offset };
  const { mainAxis, crossAxis, alignmentAxis } = offset;
  const physicalCross = crossAxis ?? 0;
  const alignOffset = alignmentAxis ?? (align === 'end' ? -physicalCross : physicalCross);
  return { sideOffset: mainAxis ?? 0, alignOffset };
}

export const Menu = memo(
  ({ items, size = 'medium', placement = 'bottom-end', children, open, offset, onOpenChange }: MenuProps) => {
    const { side, align } = placementToSideAlign(placement);
    const { sideOffset, alignOffset } = offsetToBaseUI(offset, align);

    return (
      <MenuBase.Root
        open={open}
        onOpenChange={onOpenChange ? (nextOpen, eventDetails) => onOpenChange(nextOpen, eventDetails.event) : undefined}
      >
        {children && <MenuBase.Trigger render={children} />}
        <MenuBase.Portal>
          <MenuBase.Positioner
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            className={clsx(listBoxStyles['popup'])}
          >
            <MenuBase.Popup className={listBoxStyles['list-box']}>
              {items.map((item, index) =>
                item.type === 'separator' ? (
                  <Separator key={index} />
                ) : (
                  <MenuItem key={item.label} {...item} size={size} />
                ),
              )}
            </MenuBase.Popup>
          </MenuBase.Positioner>
        </MenuBase.Portal>
      </MenuBase.Root>
    );
  },
);
