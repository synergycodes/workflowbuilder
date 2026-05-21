import i18n from 'i18next';

type Resource = {
  [lang: string]: {
    translation: {
      [key: string]: {
        [key: string]: string | { [key: string]: string };
      };
    };
  };
};

function mergePluginsTranslations(a: Resource, b: Resource): Resource {
  const langsB = Object.keys(b);

  return {
    ...a,
    ...langsB.reduce((stack: Resource, lang) => {
      stack[lang] = {
        ...a?.[lang],
        translation: {
          ...a[lang]?.translation,
          plugins: {
            ...a[lang]?.translation?.plugins,
            ...b[lang].translation.plugins,
          },
        },
      };

      return stack;
    }, {}),
  };
}

let pluginsResource: Resource = {};

export function withOptionalComponentPluginsTranslation(i18nResource: Resource): Resource {
  return mergePluginsTranslations(i18nResource, pluginsResource);
}

/**
 * Merge plugin translations into the SDK's i18next instance.
 *
 * Resources follow the i18next shape `{ [lang]: { translation: { plugins: {...} } } }`
 * — every plugin's strings live under the `plugins` namespace, scoped by
 * plugin name to avoid key collisions.
 *
 * Safe to call more than once and at any time relative to i18next init: each
 * call also issues `i18n.addResourceBundle(...)` so newly registered strings
 * surface live, even when the plugin registers after the SDK has already
 * initialised i18next.
 *
 * @example
 * ```ts
 * registerPluginTranslation({
 *   en: { translation: { plugins: { myPlugin: { hello: 'Hello' } } } },
 *   pl: { translation: { plugins: { myPlugin: { hello: 'Cześć' } } } },
 * });
 * ```
 *
 * @category Plugins
 */
export function registerPluginTranslation(pluginResourceToAdd: Resource) {
  pluginsResource = mergePluginsTranslations(pluginsResource, pluginResourceToAdd);

  // Since plugins register via `<WorkflowBuilder.Root plugins={[...]} />` —
  // which runs AFTER the SDK module graph has initialized i18next — push the
  // new strings into the live i18next instance as well. Without this, only
  // plugin translations registered via module-load side effects (pre-Phase 3a
  // behaviour) would make it into i18next.
  for (const lang of Object.keys(pluginResourceToAdd)) {
    const pluginsSubtree = pluginResourceToAdd[lang]?.translation?.plugins;
    if (pluginsSubtree) {
      i18n.addResourceBundle(lang, 'translation', { plugins: pluginsSubtree }, true, true);
    }
  }
}
