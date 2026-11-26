import type { IconData } from '@workflowbuilder/sdk';

/**
 * Stand-in for the SDK `Icon` that renders `<i data-icon="Name">`, so a test can find an icon by name
 * whether it was given by `name` or as imported data listed in `namesByIcon`.
 */
export function namedIcon(namesByIcon: ReadonlyMap<IconData, string>) {
  return function NamedIcon({ name, icon }: { name?: string; icon?: IconData }) {
    return <i data-icon={name ?? (icon && namesByIcon.get(icon))} />;
  };
}
