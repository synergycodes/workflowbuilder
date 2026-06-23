import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import clsx from 'clsx';
import { forwardRef } from 'react';

import styles from './tooltip.module.css';

import { useTooltipPlacement } from './tooltip';
import { TooltipVariant } from './types';

const TOOLTIP_OFFSET = 10;
const TOOLTIP_COLLISION_PADDING = 5;

export const TooltipContent = forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & {
    /**
     * TooltipType determines the color type of the tooltip
     */
    tooltipType?: TooltipVariant;
  }
>(function TooltipContent({ style, tooltipType = 'default', children, className, ...props }, propertyRef) {
  const { side, align } = useTooltipPlacement();

  if (!children) return null;

  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={side}
        align={align}
        sideOffset={TOOLTIP_OFFSET}
        collisionPadding={TOOLTIP_COLLISION_PADDING}
        arrowPadding={TOOLTIP_COLLISION_PADDING}
      >
        <BaseTooltip.Popup
          ref={propertyRef}
          className={clsx(styles['container'], 'ax-public-p11', className)}
          data-tooltip-type={tooltipType}
          style={style}
          {...props}
        >
          {children}
          <BaseTooltip.Arrow className={styles['arrow']} />
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
});
