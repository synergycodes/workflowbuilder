import { Menu as MenuBase } from '@base-ui/react/menu';
import type { PopupAlign, PopupSide } from '@ui/shared/types/popup-placement';
import { type ComponentProps } from 'react';

/**
 * Where a `Menu` popup opens: a side of the trigger, optionally aligned to its start or end.
 *
 * @category Menu
 */
export type Placement = PopupSide | `${PopupSide}-${PopupAlign}`;

/**
 * Offsets of a `Menu` popup from its trigger, in pixels, per axis.
 *
 * @category Menu
 */
export type OffsetAxes = {
  /** Distance from the trigger. */
  mainAxis?: number;
  /** Shift along the trigger edge, in physical direction. */
  crossAxis?: number;
  /** Shift along the trigger edge, mirrored for `-end` placements. Overrides `crossAxis`. */
  alignmentAxis?: number | null;
};

/**
 * Offset of a `Menu` popup from its trigger: a distance in pixels, or per-axis offsets.
 *
 * @category Menu
 */
export type OffsetOptions = number | OffsetAxes;

type PositionerProps = ComponentProps<typeof MenuBase.Positioner>;
type PositionerSide = NonNullable<PositionerProps['side']>;
type PositionerAlign = NonNullable<PositionerProps['align']>;

export function placementToSideAlign(placement: Placement): {
  side: PositionerSide;
  align: PositionerAlign;
} {
  const [side, alignRaw] = placement.split('-') as [PositionerSide, PositionerAlign | undefined];
  return { side, align: alignRaw ?? 'center' };
}

export function offsetToBaseUI(
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
