// Runtime registry for consumer-supplied JsonForms extensions.
//
// Populated by `<WorkflowBuilder.Root jsonForm={{ renderers, cells, translations }} />`
// and consumed by the central `<JsonForms>` renderer in `json-form.tsx`.
//
// Module-level singleton: SDK is single-instance — one `<WorkflowBuilder.Root>`
// per page, so a shared registry is intentional.
import type { JsonFormsCellRendererRegistryEntry, JsonFormsRendererRegistryEntry } from '@jsonforms/core';

/**
 * Custom JsonForms renderer entry — a `tester` predicate paired with the
 * React component that renders matching schemas. Use it to plug a
 * domain-specific control (e.g. a colour picker, code editor) into the
 * property panel.
 *
 * @category Plugins
 */
export type JsonFormsRendererExtension = JsonFormsRendererRegistryEntry;

/**
 * Custom JsonForms cell renderer — like
 * {@link JsonFormsRendererExtension} but for cell-level rendering inside
 * table-style controls.
 *
 * @category Plugins
 */
export type JsonFormsCellExtension = JsonFormsCellRendererRegistryEntry;

/**
 * i18next-shaped resource bundle accepted by
 * {@link registerPluginTranslation}. Every plugin's strings live under
 * `translation.plugins.<pluginName>` to namespace away from SDK keys.
 *
 * @category Plugins
 */
export type PluginTranslationResource = {
  [lang: string]: {
    translation: {
      [key: string]: {
        [key: string]: string | { [key: string]: string };
      };
    };
  };
};

let customRenderers: JsonFormsRendererExtension[] = [];
let customCells: JsonFormsCellExtension[] = [];

export function registerCustomRenderers(renderers: JsonFormsRendererExtension[]): void {
  customRenderers = [...customRenderers, ...renderers];
}

export function registerCustomCells(cells: JsonFormsCellExtension[]): void {
  customCells = [...customCells, ...cells];
}

export function getCustomRenderers(): JsonFormsRendererExtension[] {
  return customRenderers;
}

export function getCustomCells(): JsonFormsCellExtension[] {
  return customCells;
}
