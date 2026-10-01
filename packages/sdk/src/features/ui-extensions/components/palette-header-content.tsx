import type { PropsWithChildren } from 'react';

import { AreaContent } from '../area-content';

/**
 * Renders its children in the palette header. The content renders as a full-width row under the
 * title, so the row also fits a search field. The row shows only while the palette is expanded and
 * stacks several children in a column, so two buttons side by side need a container of their own.
 * Render it anywhere under `<WorkflowBuilder.Root>`: in the app tree, in a plugin component or in a
 * node's properties form. In a custom layout without the palette it renders nothing, which is not
 * an error.
 *
 * The children stay in the tree where they were rendered: the parent's state and context survive
 * and events bubble to it; the portal subtree remounts when the area's host unmounts.
 *
 * A canvas node template is the wrong place: it renders once per node.
 *
 * @example
 * ```tsx
 * <PaletteHeaderContent>
 *   <Input placeholder="Search nodes" value={paletteFilter} onChange={(event) => setPaletteFilter(event.target.value)} />
 * </PaletteHeaderContent>
 * ```
 *
 * @category Components
 */
export function PaletteHeaderContent({ children }: PropsWithChildren) {
  return (
    <AreaContent area="paletteHeader" componentName="PaletteHeaderContent">
      {children}
    </AreaContent>
  );
}
