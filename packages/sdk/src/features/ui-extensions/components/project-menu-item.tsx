import { RegisteredMenuItem } from '../registered-menu-item';
import type { UiMenuItemProps } from '../ui-extension-registry';

/**
 * Adds one item to the project menu (the caret menu next to the document name in the app bar)
 * after the built-in items (Settings, and Duplicate to Drafts when wired), behind a separator.
 * Renders nothing itself. Render it anywhere under `<WorkflowBuilder.Root>`.
 *
 * Labels must be unique within one menu, and changing a label remounts the row.
 *
 * @category Components
 */
export function ProjectMenuItem(props: UiMenuItemProps) {
  return <RegisteredMenuItem menu="project" componentName="ProjectMenuItem" {...props} />;
}
