import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { ReactNode, createContext, useContext, useMemo } from 'react';

import { TooltipContent } from './tooltip-content';
import { TooltipTrigger } from './tooltip-trigger';

export const TOOLTIP_OPEN_DELAY = 500;
export const TOOLTIP_CLOSE_DELAY = 0;

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'end';

export type TooltipPlacement = Side | `${Side}-${Align}`;

export type TooltipOptions = {
  /**
   * If true, the component is shown at initial
   */
  initialOpen?: boolean;
  /**
   * Tooltip placement.
   */
  placement?: TooltipPlacement;
  /**
   *  If true, the component is shown.
   */
  open?: boolean;
  /**
   * Callback fired when the component requests to be open.
   */
  onOpenChange?: (open: boolean) => void;
};

type PlacementContextValue = {
  side: Side;
  align: 'start' | 'center' | 'end';
};

const TooltipPlacementContext = createContext<PlacementContextValue>({
  side: 'bottom',
  align: 'center',
});

export function useTooltipPlacement(): PlacementContextValue {
  return useContext(TooltipPlacementContext);
}

function placementToSideAlign(placement: TooltipPlacement): PlacementContextValue {
  const [side, align] = placement.split('-') as [
    PlacementContextValue['side'],
    PlacementContextValue['align'] | undefined,
  ];
  return { side, align: align ?? 'center' };
}

type Props = {
  /**
   * Tooltip reference element.
   */
  children: ReactNode;
} & TooltipOptions;

const HOVER_FOCUS_REASONS = new Set<string>(['trigger-hover', 'trigger-focus', 'focus-out']);

/**
 * Tooltips display informative text when users hover over, focus on, or tap an element.
 */
export function Tooltip({ children, initialOpen, placement = 'bottom', open, onOpenChange }: Props) {
  const isControlled = open !== undefined;
  const placementValue = useMemo(() => placementToSideAlign(placement), [placement]);

  return (
    <TooltipPlacementContext.Provider value={placementValue}>
      <BaseTooltip.Root
        defaultOpen={initialOpen}
        open={open}
        onOpenChange={
          onOpenChange
            ? (nextOpen, eventDetails) => {
                if (isControlled && HOVER_FOCUS_REASONS.has(eventDetails.reason)) {
                  return;
                }
                onOpenChange(nextOpen);
              }
            : undefined
        }
      >
        {children}
      </BaseTooltip.Root>
    </TooltipPlacementContext.Provider>
  );
}

Tooltip.Content = TooltipContent;
Tooltip.Trigger = TooltipTrigger;
