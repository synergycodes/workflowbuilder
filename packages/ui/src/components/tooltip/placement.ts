type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'end';

export type TooltipPlacement = Side | `${Side}-${Align}`;

export type PlacementContextValue = {
  side: Side;
  align: 'start' | 'center' | 'end';
};

export function placementToSideAlign(placement: TooltipPlacement): PlacementContextValue {
  const [side, align] = placement.split('-') as [
    PlacementContextValue['side'],
    PlacementContextValue['align'] | undefined,
  ];
  return { side, align: align ?? 'center' };
}
