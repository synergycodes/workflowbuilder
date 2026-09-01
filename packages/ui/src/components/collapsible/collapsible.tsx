import { CaretUp } from '@phosphor-icons/react';
import clsx from 'clsx';
import { ReactNode, RefObject, createContext, useCallback, useContext, useRef, useState } from 'react';

import styles from './collapsible.module.css';

import { useTransitionEvent } from '../../shared/hooks/use-transition-event';
import { NavButton } from '../button/nav-button/nav-button';

interface CollapsibleContextProps {
  isExpanded: boolean;
  toggle: () => void;
  expandLabel: string;
  collapseLabel: string;
}

const CollapsibleContext = createContext<CollapsibleContextProps | undefined>(undefined);

function useCollapsibleContext() {
  const context = useContext(CollapsibleContext);
  if (context) {
    return context;
  }

  console.error('<Collapsible.Button> and <Collapsible.Content> must be used within <Collapsible>');
}

export type CollapsibleProps = {
  children: ReactNode;
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  /**
   * Accessible label for the button when the content is collapsed
   * @default 'Expand'
   */
  expandLabel?: string;
  /**
   * Accessible label for the button when the content is expanded
   * @default 'Collapse'
   */
  collapseLabel?: string;
};

export function Collapsible({
  children,
  isExpanded,
  defaultExpanded = false,
  onToggle,
  expandLabel = 'Expand',
  collapseLabel = 'Collapse',
}: CollapsibleProps) {
  const isControlled = isExpanded !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  const actualExpanded = isControlled ? isExpanded : internalExpanded;

  const toggle = useCallback(() => {
    const next = !actualExpanded;
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onToggle?.(next);
  }, [actualExpanded, isControlled, onToggle]);

  return (
    <CollapsibleContext.Provider value={{ isExpanded: actualExpanded, toggle, expandLabel, collapseLabel }}>
      {children}
    </CollapsibleContext.Provider>
  );
}

Collapsible.Button = function CollapsibleButton() {
  const context = useCollapsibleContext();

  return (
    <NavButton
      aria-label={context?.isExpanded ? context.collapseLabel : context?.expandLabel}
      className={clsx(styles['expand-button'], {
        [styles['expanded']]: context?.isExpanded,
      })}
      onClick={context?.toggle}
      prefixIcon={<CaretUp />}
    />
  );
};

Collapsible.Content = function CollapsibleContent({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const context = useCollapsibleContext();

  useOverflowDuringTransition(ref, context?.isExpanded || false);

  return (
    <div
      ref={ref}
      className={clsx(styles['content-wrapper'], {
        [styles['expanded']]: context?.isExpanded,
      })}
    >
      <div className={styles['content']}> {children}</div>
    </div>
  );
};

function useOverflowDuringTransition(
  ref: RefObject<HTMLElement | null>,
  isExpanded: boolean,
  transitionProperty: string = 'grid-template-rows',
) {
  useTransitionEvent(ref, 'transitionstart', transitionProperty, () => {
    if (!isExpanded && ref.current) {
      ref.current.style.overflow = 'hidden';
    }
  });

  useTransitionEvent(ref, 'transitionend', transitionProperty, () => {
    if (isExpanded && ref.current) {
      ref.current.style.overflow = 'unset';
    }
  });
}
