import { AreaContent } from '../area-content';
import type { WorkflowBuilderAreaContentProps } from '../ui-extension-registry';

/**
 * Renders its children in the editor header, after the logo, in line with the built-in Save button. The
 * content renders before the built-in Save button; with `place="after"` it renders after it.
 * Render it anywhere under `<WorkflowBuilder.Root>`: in the app tree, in a plugin component or in
 * a node's properties form. In a custom layout without the editor header it renders nothing, which is
 * not an error.
 *
 * The children stay in the tree where they were rendered: the parent's state and context survive
 * and events bubble to it; the portal subtree remounts when the area's host unmounts.
 *
 * A canvas node template is the wrong place: it renders once per node.
 *
 * @example
 * ```tsx
 * <EditorHeaderToolsContent>
 *   <Button size="s" variant="ghost-secondary" onClick={openTemplates}>Templates</Button>
 * </EditorHeaderToolsContent>
 * ```
 *
 * @category Components
 */
export function EditorHeaderToolsContent({ place, children }: WorkflowBuilderAreaContentProps) {
  return (
    <AreaContent area="appBarTools" componentName="EditorHeaderToolsContent" place={place}>
      {children}
    </AreaContent>
  );
}
