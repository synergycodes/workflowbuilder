import { RegisteredMenuItem } from '../registered-menu-item';
import type { WorkflowBuilderMenuItemProps } from '../ui-extension-registry';

/**
 * Adds one item to the workflow menu (the caret menu next to the workflow name in the editor header)
 * after the built-in items (Export, Import, Save as PDF when wired, and Settings), behind a separator.
 * Renders nothing itself. Render it anywhere under `<WorkflowBuilder.Root>`.
 *
 * Labels must be unique within one menu, and changing a label remounts the row.
 *
 * @category Components
 */
export function WorkflowMenuItem(props: WorkflowBuilderMenuItemProps) {
  return <RegisteredMenuItem menu="project" componentName="WorkflowMenuItem" {...props} />;
}
