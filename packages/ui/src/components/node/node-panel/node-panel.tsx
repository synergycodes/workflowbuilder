import clsx from 'clsx';
import { Children, ComponentType, PropsWithChildren, ReactElement, isValidElement, memo, useMemo } from 'react';

import handleStyles from './handle.module.css';
import nodeStyles from './node-panel.module.css';

type Props = {
  /** Whether the node panel is selected */
  selected: boolean;
  /**
   * Renders the node in its disabled state (muted surface, text and icon,
   * no hover). Used for node types that cannot be added right now, for
   * example palette entries in read-only mode.
   */
  disabled?: boolean;
  /** The content of the node panel */
  children?: React.ReactNode;
  /** css className of the node panel */
  className?: string;
};

/**
 * Node Panel component
 *
 * This component ensures a structured layout with optional slots:
 * - `NodePanel.Header`: A container for the node's header (at most 1).
 * - `NodePanel.Content`: A container for the node's main content (at most 1).
 * - `NodePanel.Handles`: A container for action handles (at most 1).
 * - `NodePanel.Overlay`: A layer over the whole node for status visuals (at most 1).
 *
 * **Usage Example**
 * ```tsx
 * <NodePanel.Root selected={true}>
 *   <NodePanel.Header>Header Content</NodePanel.Header>
 *   <NodePanel.Content>Main Content</NodePanel.Content>
 *   <NodePanel.Handles>Handles</NodePanel.Handles>
 * </NodePanel.Root>
 * ```
 *
 * **Allowed Combinations:**
 * - No children (empty node)
 * - Header only, Content only, Handles only
 * - Any combination of Header, Content, Handles, and Overlay (but max 1 each)
 *
 * **Invalid Cases (logged via `console.error`, not thrown):**
 * Validation is count-based: it compares the number of children against the
 * recognized slots, so any extra child - whether an unknown element or a
 * duplicate Header / Content / Handles / Overlay - trips the same "Unknown children
 * detected" error. The panel still renders the slots it found.
 */

const Header = memo(function Header({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx(nodeStyles['header-container'], className)}>{children}</div>;
});

const Content = memo(function Content({
  children,
  className,
  isVisible = true,
}: PropsWithChildren<{ className?: string; isVisible?: boolean }>) {
  return isVisible && <div className={clsx(nodeStyles['content-container'], className)}>{children}</div>;
});

const Handles = memo(function Handles({
  children,
  isVisible = true,
}: PropsWithChildren<{
  isVisible?: boolean;
  alignment?: 'center' | 'header';
}>) {
  return <>{isVisible && children}</>;
});

/** Covers the whole node and lets pointer events through; a child that needs them sets `pointer-events: auto`. */
const Overlay = memo(function Overlay({
  children,
  className,
  isVisible = true,
}: PropsWithChildren<{ className?: string; isVisible?: boolean }>) {
  return isVisible && <div className={clsx(nodeStyles['overlay'], className)}>{children}</div>;
});

const Root = memo(function Root({ selected, disabled = false, children, className }: Props) {
  const { headerComponent, contentComponent, handlesComponent, overlayComponent, handlesAlignment, hasHandles } =
    useMemo(() => {
      const childrenArray = Children.toArray(children);

      const headerComponent = findChild(childrenArray, NodePanel.Header);
      const contentComponent = findChild(childrenArray, NodePanel.Content);
      const handlesComponent = findChild(childrenArray, NodePanel.Handles);
      const overlayComponent = findChild(childrenArray, NodePanel.Overlay);

      validateChildren(childrenArray, headerComponent, contentComponent, handlesComponent, overlayComponent);

      const hasHandles = !!handlesComponent;
      const handlesAlignment = handlesComponent?.props.alignment || 'center';

      return {
        headerComponent,
        contentComponent,
        handlesComponent,
        overlayComponent,
        handlesAlignment,
        hasHandles,
      };
    }, [children]);

  return (
    <div className={clsx(nodeStyles['node-panel-wrapper'], handleStyles['handle-wrapper'], className)}>
      <div
        className={clsx(nodeStyles['container'], {
          [nodeStyles['selected']]: selected,
          [nodeStyles['disabled']]: disabled,
        })}
      >
        <div
          className={clsx(nodeStyles['header-wrapper'], {
            [handleStyles[handlesAlignment]]: hasHandles,
          })}
        >
          {headerComponent}
          {handlesComponent}
        </div>
        {contentComponent}
        {overlayComponent}
      </div>
    </div>
  );
});

export const NodePanel = {
  Root,
  Header,
  Content,
  Handles,
  Overlay,
};

function findChild<T>(
  childrenArray: ReturnType<typeof Children.toArray>,
  element: ComponentType<T>,
): ReactElement<T> | undefined {
  return childrenArray.find((child): child is ReactElement<T> => isValidElement(child) && child.type === element);
}

function validateChildren(
  childrenArray: ReturnType<typeof Children.toArray>,
  header: React.ReactNode,
  content: React.ReactNode,
  handles: React.ReactNode,
  overlay: React.ReactNode,
) {
  const totalValidChildren = [header, content, handles, overlay].filter(Boolean).length;
  const totalChildren = childrenArray.length;

  if (totalChildren > totalValidChildren) {
    console.error(
      `NodePanel.Root: Unknown children detected. Only NodePanel.Header, NodePanel.Content, NodePanel.Handles, and NodePanel.Overlay are allowed. ` +
        `Each of these components can be used 0 or 1 time only.`,
    );
  }
}
