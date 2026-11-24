import clsx from 'clsx';
import { forwardRef, useState } from 'react';

import styles from './accordion.module.css';

import { WithIcon } from '../../shared/types/with-icon';
import { Collapsible } from '../collapsible/collapsible';
import { Separator } from '../separator/separator';

export type AccordionProps = React.HTMLAttributes<HTMLDivElement> &
  WithIcon & {
    /**
     * Text displayed in the header
     */
    label: string;

    /**
     * Contents of the collapsible section
     */
    children: React.ReactNode;

    /**
     * Open state when controlled
     */
    open?: boolean;

    /**
     * Called with the next open state when the header is clicked
     */
    onOpenChange?: (open: boolean) => void;

    /**
     * Initial open state when uncontrolled
     * @default true
     */
    defaultOpen?: boolean;
  };

/**
 * An interactive UI component that lets users toggle the visibility of content.
 * The content section can be expanded to reveal details and collapsed to hide them,
 * keeping information organized and saving space. Commonly used in FAQs, settings panels,
 * and documentation to present layered content efficiently.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  ({ label, children, onOpenChange, open, defaultOpen = true, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const isExpanded = open ?? isOpen;

    function onExpandCollapse() {
      const newValue = !isExpanded;

      setIsOpen(newValue);
      onOpenChange?.(newValue);
    }

    return (
      // The arrow bubbles into the header's onClick, so it must not fire onOpenChange too.
      <Collapsible defaultOpen={defaultOpen} open={isExpanded}>
        <div ref={ref} className={clsx(styles['accordion'], className)} {...props}>
          <div
            className={clsx(styles['header'], {
              [styles['expanded']]: isExpanded,
            })}
            onClick={onExpandCollapse}
            aria-expanded={isExpanded}
          >
            <span className="wb-text-body-s-emphasized">{label}</span>
            <Collapsible.Button />
          </div>
          <Collapsible.Content>
            <div className={styles['inner-content']}>{children}</div>
          </Collapsible.Content>
          <Separator />
        </div>
      </Collapsible>
    );
  },
);
