import React, { memo, useMemo, ReactNode } from 'react';
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

type ComponentDecoratorOptions<Props = object> = DecoratorWithContent<Props> | DecoratorWithNoContent<Props>;

const pluginRegistryComponents = new Map<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComponentDecoratorOptions<any>[]
>();

export function registerComponentDecorator<P>(componentName: string, plugin: ComponentDecoratorOptions<P>) {
  if (!pluginRegistryComponents.has(componentName)) {
    pluginRegistryComponents.set(componentName, []);
  }

  pluginRegistryComponents.get(componentName)!.push({
    ...plugin,
    name: plugin.name ?? ((plugin as DecoratorWithContent)?.content as { name: string })?.name,
  });
}

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
        resultBefore.push(<plugin.content key={index} />);
      }

      if (place === 'wrapper') {
        resultWrapper = (
          <plugin.content key={index} props={modifiedProps} component={Component}>
            {resultWrapper}
          </plugin.content>
        );
      }

      if (place === 'after') {
        resultAfter.push(<plugin.content key={index} />);
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
