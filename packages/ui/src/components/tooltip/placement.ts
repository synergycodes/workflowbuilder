/**
 * Where a `Tooltip` opens: a side of the trigger, optionally aligned to its start or end.
 *
 * @category Tooltip
 */
export type TooltipPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end';

export type PlacementContextValue = {
  side: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'center' | 'end';
};

export function placementToSideAlign(placement: TooltipPlacement): PlacementContextValue {
  const [side, align] = placement.split('-') as [
    PlacementContextValue['side'],
    PlacementContextValue['align'] | undefined,
  ];
  return { side, align: align ?? 'center' };
}
