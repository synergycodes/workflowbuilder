import React, { memo, useMemo, ReactElement } from 'react';

type ModifyProps<P> = (props: P) => P;

type ComponentDecoratorOptions<P> = {
  modifyProps?: ModifyProps<P>;
  wrapper?: React.ElementType;
};

const pluginRegistry = new Map<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComponentDecoratorOptions<any>[]
>();

export function registerComponentDecorator<P>(componentName: string, plugin: ComponentDecoratorOptions<P>) {
  if (!pluginRegistry.has(componentName)) {
    pluginRegistry.set(componentName, []);
  }

  pluginRegistry.get(componentName)!.push(plugin);
}

export function withOptionalPlugins<TProps extends object>(
  Component: React.ComponentType<TProps>,
  componentName: string,
) {
  const DecoratedComponent = memo((props: TProps) => {
    const plugins = pluginRegistry.get(componentName) || [];

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

    const pluginsWithWrappers = plugins.filter((plugin) => plugin.wrapper);

    if (pluginsWithWrappers.length === 0) {
      return <Component {...modifiedProps} />;
    }

    let result: ReactElement = <Component {...modifiedProps} />;

    for (const plugin of pluginsWithWrappers) {
      if (plugin.wrapper) {
        const WrapperComponent = plugin.wrapper;

        result = (
          <WrapperComponent props={modifiedProps} component={Component}>
            {result}
          </WrapperComponent>
        );
      }
    }

    return result;
  });

  return DecoratedComponent;
}
