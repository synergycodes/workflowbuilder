// A Map, not a record: a slot named `constructor` would otherwise resolve off `Object.prototype`.
const REMOVED_SLOTS = new Map<string, string>([
  [
    'OptionalAppBarTools',
    'Render <EditorHeaderToolsContent> instead; builtInControls={{ save: false }} hides the Save button.',
  ],
  ['OptionalAppBarControls', 'Render <EditorHeaderControlsContent> instead.'],
  ['OptionalFooterContent', 'Render <PaletteFooterContent> instead.'],
  [
    'ProjectSelection',
    'Add menu items with <WorkflowMenuItem>, hide Settings and renaming with builtInControls, and build an own title from useWorkflowBuilderState().workflowName with setWorkflowName and openSettings from useWorkflowBuilderActions().',
  ],
]);

const RENAMED_SLOTS = new Map<string, { slot: string; propsType: string }>([
  ['PropertiesBar', { slot: 'PropertiesPanel', propsType: 'WorkflowBuilderPropertiesPanelProps' }],
  ['DiagramContainer', { slot: 'Canvas', propsType: 'WorkflowBuilderCanvasProps' }],
]);

const REMOVED_FUNCTIONS = new Map<string, string>([
  ['getControlsDotsItems', 'Add items with <WorkflowMenuItem> and hide Export and Import with builtInControls.'],
]);

/** Warns, naming the replacement, and returns `true` when 4.0 removed or renamed the slot. */
export function warnIfRemovedSlot(slot: string): boolean {
  const renamed = RENAMED_SLOTS.get(slot);
  if (renamed !== undefined) {
    console.warn(
      `[@workflowbuilder/sdk] The '${slot}' slot was renamed to '${renamed.slot}' in 4.0, so this decorator is ignored. Register it on '${renamed.slot}', typed with ${renamed.propsType}.`,
    );
    return true;
  }

  const replacement = REMOVED_SLOTS.get(slot);
  if (replacement === undefined) return false;
  console.warn(
    `[@workflowbuilder/sdk] The '${slot}' slot was removed in 4.0, so this decorator renders nothing. ${replacement}`,
  );
  return true;
}

/** Warns, naming the replacement, and returns `true` when 4.0 removed the function decorator. */
export function warnIfRemovedFunction(functionName: string): boolean {
  const replacement = REMOVED_FUNCTIONS.get(functionName);
  if (replacement === undefined) return false;
  console.warn(
    `[@workflowbuilder/sdk] The '${functionName}' function decorator was removed in 4.0, so this decorator never runs. ${replacement}`,
  );
  return true;
}

export function removedPropertyWarning(property: string, component: string, replacement: string): string {
  return `[@workflowbuilder/sdk] ${property} was removed from ${component} in 4.0 and is ignored. Render <${replacement}> instead.`;
}
