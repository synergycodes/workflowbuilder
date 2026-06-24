import clsx from 'clsx';
import { Children, ComponentType, PropsWithChildren, ReactElement, isValidElement, memo, useMemo } from 'react';

import handleStyles from './handle.module.css';
import nodeStyles from './node-panel.module.css';

type Props = {
  /** Whether the node panel is selected */
  selected: boolean;
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
 * - Any combination of Header, Content, and Handles (but max 1 each)
 *
 * **Invalid Cases (Throws a Runtime Warning):**
 * - More than one instance of `NodePanel.Header`, `<NodePanel.Content`, or `NodePanel.Handles`
 * - Passing an unknown child element
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

const Root = memo(function Root({ selected, children, className }: Props) {
  const { headerComponent, contentComponent, handlesComponent, handlesAlignment, hasHandles } = useMemo(() => {
    const childrenArray = Children.toArray(children);

    const headerComponent = findChild(childrenArray, NodePanel.Header);
    const contentComponent = findChild(childrenArray, NodePanel.Content);
    const handlesComponent = findChild(childrenArray, NodePanel.Handles);

    validateChildren(childrenArray, headerComponent, contentComponent, handlesComponent);

    const hasHandles = !!handlesComponent;
    const handlesAlignment = handlesComponent?.props.alignment || 'center';

    return {
      headerComponent,
      contentComponent,
      handlesComponent,
      handlesAlignment,
      hasHandles,
    };
  }, [children]);

  return (
    <div className={clsx(nodeStyles['node-panel-wrapper'], handleStyles['handle-wrapper'], className)}>
      <div
        className={clsx(nodeStyles['container'], {
          [nodeStyles['selected']]: selected,
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
      </div>
    </div>
  );
});

export const NodePanel = {
  Root,
  Header,
  Content,
  Handles,
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
) {
  const totalValidChildren = (header ? 1 : 0) + (content ? 1 : 0) + (handles ? 1 : 0);
  const totalChildren = childrenArray.length;

  if (totalChildren > totalValidChildren) {
    console.error(
      `NodePanel.Root: Unknown children detected. Only NodePanel.Header, NodePanel.Content, and NodePanel.Handles are allowed. ` +
        `Each of these components can be used 0 or 1 time only.`,
    );
  }
}
