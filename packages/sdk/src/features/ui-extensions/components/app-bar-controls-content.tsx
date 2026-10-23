import { AreaContent } from '../area-content';
import type { WorkflowBuilderAreaContentProps } from '../ui-extension-registry';

/**
 * Renders its children in the controls on the right of the editor header, in line with the built-in
 * language selector, read-only switch and theme switch. The content renders before those built-in
 * controls; with `place="after"` it renders after them, before the menu button. Render it anywhere
 * under `<WorkflowBuilder.Root>`: in the app tree, in a plugin component or in a node's properties
 * form. In a custom layout without the editor header it renders nothing, which is not an error.
 *
 * The children stay in the tree where they were rendered: the parent's state and context survive
 * and events bubble to it; the portal subtree remounts when the area's host unmounts.
 *
 * A canvas node template is the wrong place: it renders once per node.
 *
 * @example
 * ```tsx
 * <EditorHeaderControlsContent>
 *   <Button size="s" variant="ghost-secondary" onClick={openHelp}>Help</Button>
 * </EditorHeaderControlsContent>
 * ```
 *
 * @category Components
 */
export function EditorHeaderControlsContent({ place, children }: WorkflowBuilderAreaContentProps) {
  return (
    <AreaContent area="appBarControls" componentName="EditorHeaderControlsContent" place={place}>
      {children}
    </AreaContent>
  );
}
