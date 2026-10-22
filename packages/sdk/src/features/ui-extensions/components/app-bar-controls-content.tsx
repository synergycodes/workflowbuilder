import type { PropsWithChildren } from 'react';

import { AreaContent } from '../area-content';

/**
 * Renders its children in the controls on the right of the app bar, in line with the built-in
 * language selector, read-only switch and theme switch. The content renders before those built-in
 * controls and before anything added through the deprecated `OptionalAppBarControls` slot. With
 * `place="after"` it renders after those built-in controls and after content from the deprecated
 * slot, before the menu button. Render it anywhere under `<WorkflowBuilder.Root>`: in the app tree,
 * in a plugin component or in a node's properties form. In a custom layout without the app bar it
 * renders nothing, which is not an error.
 *
 * The children stay in the tree where they were rendered: the parent's state and context survive
 * and events bubble to it; the portal subtree remounts when the area's host unmounts.
 *
 * A canvas node template is the wrong place: it renders once per node.
 *
 * @example
 * ```tsx
 * <AppBarControlsContent>
 *   <Button size="s" variant="ghost-secondary" onClick={openHelp}>Help</Button>
 * </AppBarControlsContent>
 * ```
 *
 * @category Components
 */
export function AppBarControlsContent({ place, children }: PropsWithChildren<{ place?: 'before' | 'after' }>) {
  return (
    <AreaContent area="appBarControls" componentName="AppBarControlsContent" place={place}>
      {children}
    </AreaContent>
  );
}
