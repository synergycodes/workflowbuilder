import { Menu as MenuBase } from '@base-ui/react/menu';
import { type ComponentProps } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'end';

export type Placement = Side | `${Side}-${Align}`;

type OffsetAxes = {
  mainAxis?: number;
  crossAxis?: number;
  alignmentAxis?: number | null;
};

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
