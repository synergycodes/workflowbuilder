import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { ReactNode, useMemo } from 'react';

import { type TooltipPlacement, placementToSideAlign } from './placement';
import { TooltipContent } from './tooltip-content';
import { TooltipPlacementProvider } from './tooltip-context';
import { TooltipTrigger } from './tooltip-trigger';

export type { TooltipPlacement } from './placement';

export type TooltipOptions = {
  /**
   * If true, the component is shown at initial
   */
  initialOpen?: boolean;
  /**
   * Tooltip placement.
   * @default 'bottom'
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

export type TooltipProps = {
  /**
   * Tooltip reference element.
   */
  children: ReactNode;
} & TooltipOptions;

const HOVER_FOCUS_REASONS = new Set<string>(['trigger-hover', 'trigger-focus', 'focus-out']);

/**
 * Tooltips display informative text when users hover over, focus on, or tap an element.
 */
export function Tooltip({ children, initialOpen, placement = 'bottom', open, onOpenChange }: TooltipProps) {
  const isControlled = open !== undefined;
  const placementValue = useMemo(() => placementToSideAlign(placement), [placement]);

  return (
    <TooltipPlacementProvider value={placementValue}>
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
    </TooltipPlacementProvider>
  );
}

Tooltip.Content = TooltipContent;
Tooltip.Trigger = TooltipTrigger;
