/**
 * Key of a built-in control in the app bar, the palette or the properties panel, as used in
 * {@link BuiltInControls}.
 *
 * @category Core
 */
export type BuiltInControl =
  | 'save'
  | 'readOnlyToggle'
  | 'themeToggle'
  | 'languageSelector'
  | 'settings'
  | 'documentRename'
  | 'export'
  | 'import'
  | 'templates'
  | 'paletteToggle'
  | 'delete'
  | 'propertiesPanelToggle';

/**
 * Which built-in controls `<WorkflowBuilder.Root>` shows. A missing key shows the control, `false`
 * hides it. Hiding only removes the control: what it does stays available. The palette starts
 * collapsed, so hiding `paletteToggle` means it never opens unless the app calls
 * `setPaletteOpen(true)` itself; hiding `propertiesPanelToggle` leaves the same dead end once the
 * panel is collapsed, unless the app calls `setPropertiesPanelOpen(true)`.
 *
 * @category Core
 */
export type BuiltInControls = Partial<Record<BuiltInControl, boolean>>;
