import type { PopupAlign, PopupSide } from '@ui/shared/types/popup-placement';

/**
 * Where a `Tooltip` opens: a side of the trigger, optionally aligned to its start or end.
 *
 * @category Tooltip
 */
export type TooltipPlacement = PopupSide | `${PopupSide}-${PopupAlign}`;

export type PlacementContextValue = {
  side: PopupSide;
  align: PopupAlign | 'center';
};

export function placementToSideAlign(placement: TooltipPlacement): PlacementContextValue {
  const [side, align] = placement.split('-') as [
    PlacementContextValue['side'],
    PlacementContextValue['align'] | undefined,
  ];
  return { side, align: align ?? 'center' };
}
