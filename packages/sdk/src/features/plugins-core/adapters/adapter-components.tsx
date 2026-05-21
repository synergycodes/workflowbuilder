import { type ReactNode } from 'react';
import type React from 'react';
import { memo, useMemo } from 'react';

import { registerDecorator } from './utils/register-decorator';
import { sortByPriority } from './utils/sort-by-priority';

type ModifyProps<P> = (props: P) => P;

type SharedDecoratorOptions<Props = object> = {
  modifyProps?: ModifyProps<Props>;
  priority?: number;
  name?: string;
};

type DecoratorWithContent<Props = object> = {
  place?: 'before' | 'after' | 'wrapper';
  content: React.ElementType;
} & SharedDecoratorOptions<Props>;

type DecoratorWithNoContent<Props = object> = SharedDecoratorOptions<Props>;

/**
 * Options accepted by {@link registerComponentDecorator}. Two shapes:
 *
 * - With `content`: mount a React component into a named slot — `'before'`,
 *   `'after'`, or as a `'wrapper'` around the host component.
 * - Without `content`: only `modifyProps` runs, transforming props passed to
 *   the host component without rendering extra UI.
 *
 * `priority` controls the relative order when multiple plugins decorate the
 * same slot (higher runs first; default `0`). `name` is used to deduplicate
 * registrations — passing the same `name` twice replaces the earlier entry.
 *
 * @category Plugins
 */
export type ComponentDecoratorOptions<Props = object> = DecoratorWithContent<Props> | DecoratorWithNoContent<Props>;

const pluginRegistryComponents = new Map<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComponentDecoratorOptions<any>[]
>();

/**
 * Decorate a named slot — add UI before/after/around it or transform its props.
 *
 * Slots are mount points the SDK exposes for plugins to inject custom UI
 * without forking the editor. Common slots include `'OptionalAppBarControls'`,
 * `'OptionalNodeContent'`, and others — see the
 * [Build a plugin](/docs/guides/build-a-plugin/) guide for the authoritative
 * list.
 *
 * Safe to call more than once; pass `plugin.name` to deduplicate.
 *
 * @param componentName - Slot identifier (e.g. `'OptionalAppBarControls'`).
 * @param plugin - Decorator configuration. See {@link ComponentDecoratorOptions}.
 *
 * @example
 * ```ts
 * registerComponentDecorator('OptionalAppBarControls', {
 *   content: MyButton,
 *   place: 'after',
 *   name: 'analytics-button',
 * });
 * ```
 *
 * @category Plugins
 */
export function registerComponentDecorator<P>(componentName: string, plugin: ComponentDecoratorOptions<P>) {
  const resolvedName = plugin.name ?? ((plugin as DecoratorWithContent)?.content as { name: string })?.name;

  registerDecorator(pluginRegistryComponents, componentName, { ...plugin, name: resolvedName });
}

/**
 * Test whether a plugin with the given `pluginName` is currently registered
 * for the named slot. Useful in plugin code that conditionally registers
 * dependent decorators.
 *
 * @category Plugins
 */
export function hasRegisteredComponentDecorator(componentName: string, pluginName: string) {
  return pluginRegistryComponents.get(componentName)?.some((plugin) => plugin.name === pluginName);
}

export function withOptionalComponentPlugins<TProps extends object>(
  Component: React.ComponentType<TProps>,
  componentName: string,
) {
  const DecoratedComponent = memo((props: TProps) => {
    const plugins = pluginRegistryComponents.get(componentName)?.sort(sortByPriority) || [];

    const modifiedProps = useMemo(() => {
      let result = { ...props };

      for (const plugin of plugins) {
        if (plugin.modifyProps) {
          result = plugin.modifyProps(result);
        }
      }

      return result;
      // We don't need a dependency on plugins (plugin injection is not dynamic).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props]);

    const pluginsWithContent = plugins.filter(
      (plugin) => (plugin as DecoratorWithContent).content,
    ) as DecoratorWithContent[];

    if (pluginsWithContent.length === 0) {
      return <Component {...modifiedProps} />;
    }

    const resultBefore: ReactNode[] = [];
    let resultWrapper: ReactNode = <Component {...modifiedProps} />;
    const resultAfter: ReactNode[] = [];

    for (const [index, plugin] of pluginsWithContent.entries()) {
      const place = plugin.place || 'before';

      if (place === 'before') {
        resultBefore.push(<plugin.content key={index} props={modifiedProps} />);
      }

      if (place === 'wrapper') {
        resultWrapper = (
          <plugin.content key={index} props={modifiedProps} component={Component}>
            {resultWrapper}
          </plugin.content>
        );
      }

      if (place === 'after') {
        resultAfter.push(<plugin.content key={index} props={modifiedProps} />);
      }
    }

    if (resultBefore.length === 0 && resultAfter.length === 0) {
      return resultWrapper;
    }

    return (
      <>
        {resultBefore}
        {resultWrapper}
        {resultAfter}
      </>
    );
  });

  return DecoratedComponent;
}
