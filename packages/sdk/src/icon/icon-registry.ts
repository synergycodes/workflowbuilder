import type { IconData } from '@workflowbuilder/ui';

import { type BuiltInIconName, builtInIcons } from './built-in-icons';

/**
 * Icons available by name, keyed by the name that node definitions, palette items, templates and select options use.
 *
 * @category Icons
 */
export type IconSet = Readonly<Record<string, IconData>>;

/**
 * Augment it with the app's icon set to type icon names against the registered icons:
 * `declare module '@workflowbuilder/sdk' { interface Register { icons: typeof appIcons } }`.
 * Without the augmentation any string type-checks as an icon name.
 *
 * @category Icons
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled by module augmentation in the app
export interface Register {}

/**
 * Augment it in a plugin package with the icons the plugin passes to `registerIcons`:
 * `declare module '@workflowbuilder/sdk' { interface PluginIconNames extends IconNamesOf<typeof pluginIcons> {} }`.
 * Every plugin adds its own names; they count once the app augments `Register`.
 *
 * @category Icons
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled by module augmentation in plugin packages
export interface PluginIconNames {}

/**
 * The names of an icon set, in the shape `PluginIconNames` extends.
 *
 * @category Icons
 */
export type IconNamesOf<Icons extends IconSet> = { readonly [Name in keyof Icons]: true };

type AppIconName = Register extends { icons: infer Icons } ? Extract<keyof Icons, string> : string;

/**
 * Name of an icon the SDK can render: one of its built-in icons, one the app registered or one a plugin registered.
 *
 * @category Icons
 */
export type WBIcon = BuiltInIconName | AppIconName | Extract<keyof PluginIconNames, string>;

/**
 * Declares the icons an app passes to `<WorkflowBuilder.Root icons>`, keeping their names as literal types.
 *
 * @category Icons
 */
export function defineIcons<const Icons extends IconSet>(icons: Icons): Icons {
  return icons;
}

/**
 * Registers icons a plugin's node types, templates or select options name. Call it in the plugin's initializer and
 * augment `PluginIconNames` with the same set. An app icon of the same name wins over a plugin icon.
 *
 * @category Icons
 */
export function registerIcons(icons: IconSet): void {
  pluginIcons = { ...pluginIcons, ...icons };
}

const builtIns: IconSet = builtInIcons;
let appIcons: IconSet = {};
let pluginIcons: IconSet = {};

export function setRegisteredIcons(icons: IconSet | null): void {
  appIcons = icons ?? {};
}

/** App icons win over plugin icons, and both over built-in icons of the same name. */
export function findIcon(name: string): IconData | undefined {
  // Own-property checks, so a name such as `constructor` does not resolve off Object.prototype.
  if (Object.hasOwn(appIcons, name)) return appIcons[name];
  if (Object.hasOwn(pluginIcons, name)) return pluginIcons[name];
  if (Object.hasOwn(builtIns, name)) return builtIns[name];

  return undefined;
}
