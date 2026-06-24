import { mergeProps } from '@base-ui/react/merge-props';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { ReactElement, cloneElement, forwardRef, isValidElement } from 'react';

import { useTooltipDelay } from './tooltip';

/**
 * Tooltips trigger is the the element that toggles the tooltip
 */
export const TooltipTrigger = forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & {
    /**
     * `asChild` allows the user to pass any element as the anchor
     */
    asChild?: boolean;
  }
>(function TooltipTrigger({ children, asChild = false, ...props }, propertyRef) {
  const { delay, closeDelay } = useTooltipDelay();

  return (
    <BaseTooltip.Trigger
      ref={propertyRef as React.Ref<HTMLButtonElement>}
      delay={delay}
      closeDelay={closeDelay}
      // Keep parity with the previous Floating UI behaviour: clicking the
      // trigger should not dismiss the tooltip while hover is still active.
      closeOnClick={false}
      render={(triggerProps, state) => {
        const dataState = state.open ? 'open' : 'closed';

        if (asChild && isValidElement(children)) {
          const childElement = children as ReactElement<Record<string, unknown>>;
          // mergeProps composes event handlers (all of them run) and merges
          // className/style — a plain spread would let a child's own
          // onMouseEnter/onFocus silently replace Base UI's interaction
          // handlers and break the tooltip.
          return cloneElement(childElement, {
            ...mergeProps(triggerProps, props as Record<string, unknown>, childElement.props ?? {}),
            'data-state': dataState,
          });
        }

        return (
          <div {...mergeProps(triggerProps, props as Record<string, unknown>)} data-state={dataState}>
            {children}
          </div>
        );
      }}
    />
  );
});
