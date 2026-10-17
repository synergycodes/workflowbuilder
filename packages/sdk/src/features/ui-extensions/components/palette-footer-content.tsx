import type { PropsWithChildren } from 'react';

import { AreaContent } from '../area-content';

/**
 * Renders its children in the palette footer, with the built-in Templates button. The content
 * renders before the built-in Templates button and before anything added through the deprecated
 * `OptionalFooterContent` slot. With `place="after"` it renders after the Templates button and
 * after content from the deprecated slot. The footer shows only while the palette is expanded and
 * lays its content out in a column, so two buttons side by side need a container of their own.
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
 * <PaletteFooterContent>
 *   <Button size="s" variant="ghost-secondary" onClick={openMarketplace}>Marketplace</Button>
 * </PaletteFooterContent>
 * ```
 *
 * @category Components
 */
export function PaletteFooterContent({ place, children }: PropsWithChildren<{ place?: 'before' | 'after' }>) {
  return (
    <AreaContent area="paletteFooter" componentName="PaletteFooterContent" place={place}>
      {children}
    </AreaContent>
  );
}
