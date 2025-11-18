import { sortByPriority } from './utils/sort-by-priority';

type CallbackBefore = (params: { params: unknown[] }) => void | { replacedParams: unknown[] };

type SharedDecoratorOptions = {
  priority?: number;
  name?: string;
};

type DecoratorOptionsBefore = {
  place?: 'before';
  callback: CallbackBefore;
} & SharedDecoratorOptions;

type CallbackAfter = (params: { params: unknown[]; returnValue: unknown }) => void | { replacedReturn: unknown };

type DecoratorOptionsAfter = {
  place: 'after';
  callback: CallbackAfter;
} & SharedDecoratorOptions;

type CallbackDecoratorOptions = DecoratorOptionsBefore | DecoratorOptionsAfter;

const pluginRegistryCallbacks = new Map<string, CallbackDecoratorOptions[]>();

export function registerFunctionDecorator(functionName: string, plugin: CallbackDecoratorOptions) {
  if (!pluginRegistryCallbacks.has(functionName)) {
    pluginRegistryCallbacks.set(functionName, []);
  }

  pluginRegistryCallbacks.get(functionName)!.push({
    ...plugin,
    name: plugin.name ?? plugin.callback.name,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withOptionalFunctionPlugins<F extends (...arguments_: any[]) => any>(
  rootFunction: F,
  functionName: string,
) {
  return (...params: Parameters<F>) => {
    const plugins = pluginRegistryCallbacks.get(functionName)?.sort(sortByPriority) || [];

    const pluginsBefore = plugins.filter(({ place }) => place !== 'after') as DecoratorOptionsBefore[];
    const pluginsAfter = plugins.filter(({ place }) => place === 'after') as DecoratorOptionsAfter[];

    // Those can modify params that wrapped function will receive
    let paramsToUse: Parameters<F> = params;
    for (const plugin of pluginsBefore) {
      const response = plugin.callback({ params: paramsToUse });

      if (response?.replacedParams) {
        paramsToUse = response.replacedParams as Parameters<F>;
      }
    }

    const returnValue = rootFunction(...paramsToUse) as ReturnType<F>;

    // Those can modify value that wrapped function will return
    let returnValueToUse = returnValue;
    for (const plugin of pluginsAfter) {
      const response = plugin.callback({ params: paramsToUse, returnValue: returnValueToUse });

      if (response?.replacedReturn) {
        returnValueToUse = response.replacedReturn as ReturnType<F>;
      }
    }

    return returnValueToUse;
  };
}
