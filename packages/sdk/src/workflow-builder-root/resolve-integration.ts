import type { IntegrationStrategy, OnSaveExternal } from '../types/integration';
import type { WorkflowBuilderIntegration } from './workflow-builder-root.types';

export type ResolvedIntegration = {
  strategy: IntegrationStrategy;
  endpoints: { load: string; save: string } | undefined;
  onDataSave: OnSaveExternal | undefined;
};

/**
 * Maps the `WorkflowBuilderIntegration` discriminated union into a flat
 * shape consumed by `RuntimeIntegrationWrapper`. Defaults to `localStorage`
 * when `integration` is omitted or `{ strategy: undefined }`.
 *
 * @internal Used by `<WorkflowBuilderRoot>`; not part of the public API.
 */
export function resolveIntegration(integration?: WorkflowBuilderIntegration): ResolvedIntegration {
  if (integration?.strategy === 'api') {
    return { strategy: 'api', endpoints: integration.endpoints, onDataSave: undefined };
  }
  if (integration?.strategy === 'props') {
    return { strategy: 'props', endpoints: undefined, onDataSave: integration.onDataSave };
  }
  return { strategy: 'localStorage', endpoints: undefined, onDataSave: undefined };
}
