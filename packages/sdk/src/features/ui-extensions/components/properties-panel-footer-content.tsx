import type { PropsWithChildren } from 'react';

import { AreaContent } from '../area-content';

/**
 * Renders its children in the properties panel footer, below the scrolling content. The content
 * renders before the built-in Delete button. With `place="after"` it renders after the Delete
 * button. The footer shows only while the panel is expanded and lays its content out in a column,
 * so two buttons side by side need a container of their own. Render it anywhere under
 * `<WorkflowBuilder.Root>`: in the app tree, in a plugin component or in a node's properties form,
 * such as a JsonForms control. Content from the form lives with the form, so it leaves the footer
 * while another tab is selected. In a custom layout without the properties panel it renders
 * nothing, which is not an error.
 *
 * The children stay in the tree where they were rendered: the parent's state and context survive
 * and events bubble to it; the portal subtree remounts when the area's host unmounts.
 *
 * A canvas node template is the wrong place: it renders once per node.
 *
 * @example
 * ```tsx
 * <PropertiesPanelFooterContent>
 *   <Button variant="primary" onClick={approve}>Approve</Button>
 * </PropertiesPanelFooterContent>
 * ```
 *
 * @category Components
 */
export function PropertiesPanelFooterContent({ place, children }: PropsWithChildren<{ place?: 'before' | 'after' }>) {
  return (
    <AreaContent area="propertiesPanelFooter" componentName="PropertiesPanelFooterContent" place={place}>
      {children}
    </AreaContent>
  );
}
