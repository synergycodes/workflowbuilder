import { createContext, useContext } from 'react';

import { type PlacementContextValue } from './placement';

export const TOOLTIP_OPEN_DELAY = 500;
export const TOOLTIP_CLOSE_DELAY = 0;

const TooltipPlacementContext = createContext<PlacementContextValue>({
  side: 'bottom',
  align: 'center',
});

export const TooltipPlacementProvider = TooltipPlacementContext.Provider;

export function useTooltipPlacement(): PlacementContextValue {
  return useContext(TooltipPlacementContext);
}
