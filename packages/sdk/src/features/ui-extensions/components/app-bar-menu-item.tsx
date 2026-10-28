import { RegisteredMenuItem } from '../registered-menu-item';
import type { WorkflowBuilderMenuItemProps } from '../ui-extension-registry';

/**
 * Adds one item to the editor header's kebab menu, after the built-in Export and Import items, behind
 * a separator. Renders nothing itself. Render it anywhere under `<WorkflowBuilder.Root>`.
 *
 * Labels must be unique within one menu, and changing a label remounts the row.
 *
 * @category Components
 */
export function EditorHeaderMenuItem(props: WorkflowBuilderMenuItemProps) {
  return <RegisteredMenuItem menu="appBar" componentName="EditorHeaderMenuItem" {...props} />;
}
