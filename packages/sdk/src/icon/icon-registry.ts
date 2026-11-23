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

type AppIconName = Register extends { icons: infer Icons } ? Extract<keyof Icons, string> : string;

/**
 * Name of an icon the SDK can render: one of its built-in icons or one the app registered.
 *
 * @category Icons
 */
export type WBIcon = BuiltInIconName | AppIconName;

/**
 * Icon set in the Iconify JSON format, as produced by `@iconify/tools` or shipped by `@iconify-json/*` packages.
 *
 * @category Icons
 */
export type IconifyIconSet = {
  icons: Readonly<Record<string, IconData>>;
  aliases?: Readonly<Record<string, IconifyAlias>>;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
};

/**
 * Another name for an icon of the set. `Icon` does not rotate or flip glyphs, so `fromIconify` leaves out aliases that do.
 *
 * @category Icons
 */
export type IconifyAlias = {
  parent: string;
  rotate?: number;
  hFlip?: boolean;
  vFlip?: boolean;
};

type TransformedAlias = { rotate: unknown } | { hFlip: unknown } | { vFlip: unknown };

type PascalCase<Name extends string> = Name extends `${infer Head}-${infer Tail}`
  ? `${Capitalize<Head>}${PascalCase<Tail>}`
  : Capitalize<Name>;

type UntransformedAliasName<IconSetJson extends IconifyIconSet> = {
  [Name in keyof IconSetJson['aliases']]: IconSetJson['aliases'][Name] extends TransformedAlias ? never : Name;
}[keyof IconSetJson['aliases']];

type RenamedIconifyIcons<IconSetJson extends IconifyIconSet> = {
  [Name in keyof IconSetJson['icons'] | UntransformedAliasName<IconSetJson> as PascalCase<
    Extract<Name, string>
  >]: IconData;
};

/**
 * Declares the icons an app passes to `<WorkflowBuilder.Root icons>`, keeping their names as literal types.
 *
 * @category Icons
 */
export function defineIcons<const Icons extends IconSet>(icons: Icons): Icons {
  return icons;
}

/**
 * Turns an Iconify JSON icon set into an icon set for `defineIcons`, renaming `hubspot-logo` to `HubspotLogo`.
 * Aliases become icons of their own, except those that rotate or flip their parent.
 *
 * @category Icons
 */
export function fromIconify<const IconSetJson extends IconifyIconSet>(
  iconSet: IconSetJson,
): RenamedIconifyIcons<IconSetJson> {
  const sharedDimensions = sharedDimensionsOf(iconSet);
  const names = [...Object.keys(iconSet.icons), ...Object.keys(iconSet.aliases ?? {})];
  const entries = names.flatMap((name) => {
    const icon = resolveIconifyIcon(iconSet, name, new Set());

    return icon ? [[toPascalCase(name), { ...sharedDimensions, ...icon }]] : [];
  });

  // Object.fromEntries cannot express the renamed keys of the mapped return type.
  return Object.fromEntries(entries) as RenamedIconifyIcons<IconSetJson>;
}

const builtIns: IconSet = builtInIcons;
let appIcons: IconSet = {};

export function setRegisteredIcons(icons: IconSet | null): void {
  appIcons = icons ?? {};
}

/** App icons take precedence over built-in icons of the same name. */
export function findIcon(name: string): IconData | undefined {
  // Own-property checks, so a name such as `constructor` does not resolve off Object.prototype.
  if (Object.hasOwn(appIcons, name)) return appIcons[name];
  if (Object.hasOwn(builtIns, name)) return builtIns[name];

  return undefined;
}

function resolveIconifyIcon(iconSet: IconifyIconSet, name: string, visited: Set<string>): IconData | undefined {
  if (Object.hasOwn(iconSet.icons, name)) return iconSet.icons[name];

  const alias = iconSet.aliases && Object.hasOwn(iconSet.aliases, name) ? iconSet.aliases[name] : undefined;
  if (!alias || alias.rotate || alias.hFlip || alias.vFlip || visited.has(name)) return undefined;

  visited.add(name);
  return resolveIconifyIcon(iconSet, alias.parent, visited);
}

function toPascalCase(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function sharedDimensionsOf(iconSet: IconifyIconSet): Omit<IconData, 'body'> {
  const dimensions: Omit<IconData, 'body'> = {};
  for (const key of ['left', 'top', 'width', 'height'] as const) {
    const value = iconSet[key];
    if (value !== undefined) dimensions[key] = value;
  }

  return dimensions;
}
