import { RegisteredMenuItem } from '../registered-menu-item';
import type { UiMenuItemProps } from '../ui-extension-registry';

/**
 * Adds one item to the properties panel header's menu, after any built-in items there, behind a
 * separator. The menu button itself only appears while the panel is expanded. Renders nothing
 * itself. Render it anywhere under `<WorkflowBuilder.Root>`, including from inside a node's
 * properties form.
 *
 * Labels must be unique within one menu, and changing a label remounts the row.
 *
 * @category Components
 */
export function PropertiesPanelMenuItem(props: UiMenuItemProps) {
  return <RegisteredMenuItem menu="propertiesPanel" componentName="PropertiesPanelMenuItem" {...props} />;
}
