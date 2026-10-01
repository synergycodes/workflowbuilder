import type { PropsWithChildren } from 'react';

import { AreaContent } from '../area-content';

/**
 * Renders its children in the app bar, after the logo, in line with the built-in Save button. The
 * content renders before the built-in Save button and before anything added through the deprecated
 * `OptionalAppBarTools` slot. With `place="after"` it renders after the Save button and after
 * content from the deprecated slot. Render it anywhere under `<WorkflowBuilder.Root>`: in the app
 * tree, in a plugin component or in a node's properties form. In a custom layout without the app
 * bar it renders nothing, which is not an error.
 *
 * The children stay in the tree where they were rendered: the parent's state and context survive
 * and events bubble to it; the portal subtree remounts when the area's host unmounts.
 *
 * A canvas node template is the wrong place: it renders once per node.
 *
 * @example
 * ```tsx
 * <AppBarToolsContent>
 *   <Button size="s" variant="ghost-secondary" onClick={openTemplates}>Templates</Button>
 * </AppBarToolsContent>
 * ```
 *
 * @category Components
 */
export function AppBarToolsContent({ place, children }: PropsWithChildren<{ place?: 'before' | 'after' }>) {
  return (
    <AreaContent area="appBarTools" componentName="AppBarToolsContent" place={place}>
      {children}
    </AreaContent>
  );
}
