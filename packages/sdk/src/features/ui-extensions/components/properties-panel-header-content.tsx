import type { PropsWithChildren } from 'react';

import { AreaContent } from '../area-content';

/**
 * Renders its children in the properties panel header. The content renders as a full-width row
 * under the title and the selected element's name. With `place="after"` it renders in a second row
 * at the end of the header, under the tabs when the panel shows them. The row shows only while the
 * panel is expanded and stacks several children in a column, so two buttons side by side need a
 * container of their own. Render it anywhere under `<WorkflowBuilder.Root>`: in the app tree, in a
 * plugin component or in a node's properties form. In a custom layout without the properties panel
 * it renders nothing, which is not an error.
 *
 * The children stay in the tree where they were rendered: the parent's state and context survive
 * and events bubble to it; the portal subtree remounts when the area's host unmounts.
 *
 * A canvas node template is the wrong place: it renders once per node.
 *
 * @example
 * ```tsx
 * <PropertiesPanelHeaderContent>
 *   <Button size="xs" variant="ghost-primary" onClick={openDocs}>Docs</Button>
 * </PropertiesPanelHeaderContent>
 * ```
 *
 * @category Components
 */
export function PropertiesPanelHeaderContent({ place, children }: PropsWithChildren<{ place?: 'before' | 'after' }>) {
  return (
    <AreaContent area="propertiesPanelHeader" componentName="PropertiesPanelHeaderContent" place={place}>
      {children}
    </AreaContent>
  );
}
