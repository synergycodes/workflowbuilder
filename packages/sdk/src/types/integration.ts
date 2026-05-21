import type { VariablesIndex } from '../features/variables/types';
import type { LayoutDirection } from '../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../node/node-data';

/**
 * Persistence strategy identifier — one of:
 *
 * - `'localStorage'`: editor reads / writes the diagram under a fixed
 *   `'workflowBuilderDiagram'` key in browser `localStorage` (not
 *   derived from the instance `name` prop). Default.
 * - `'api'`: editor performs HTTP load + save against the configured
 *   `endpoints.load` / `endpoints.save` URLs.
 * - `'props'`: editor calls the host-supplied `onDataSave` callback;
 *   initial state comes from `initialNodes` / `initialEdges` props.
 *
 * @category Integration
 */
export type IntegrationStrategy = 'localStorage' | 'api' | 'props';

/**
 * Canonical persistable shape of a workflow document. Returned by
 * {@link getStoreDataForIntegration} and passed to the host's save
 * callback under the `'props'` strategy.
 *
 * @category Integration
 */
export type IntegrationDataFormat = {
  name: string;
  globalVariables: VariablesIndex;
  layoutDirection: LayoutDirection;
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
};

/**
 * Same shape as {@link IntegrationDataFormat} but with every field
 * optional — accepted by load callbacks that may only deliver a partial
 * payload (e.g. just nodes + edges, layoutDirection inferred).
 *
 * @category Integration
 */
export type IntegrationDataFormatOptional = Partial<IntegrationDataFormat>;

/**
 * Optional metadata passed to save callbacks. Today only `isAutoSave`
 * exists — the host can use it to suppress UI feedback on autosaves.
 *
 * @category Integration
 */
export type OnSaveParams = { isAutoSave?: boolean };

/**
 * Resolution of a save attempt — three documented values: `'success'`
 * (committed), `'error'` (failed), `'alreadyStarted'` (a save was
 * already in flight and the new request was coalesced).
 *
 * Today's runtime treats every non-empty resolution as "the save
 * finished" and surfaces the success-style snackbar — so all three
 * variants currently look identical at the UI layer. Throw from the
 * save callback (rather than resolving to `'error'`) if you need an
 * error snackbar specifically.
 *
 * @category Integration
 */
export type DidSaveStatus = 'error' | 'success' | 'alreadyStarted';

// The OnSave function is used throughout the Workflow Builder application.
// You can call it from anywhere, and it will trigger the onSave action in the integration wrapper.
export type OnSave = (savingParams?: OnSaveParams) => Promise<DidSaveStatus>;

/**
 * Save callback shape the host supplies under the `'props'` integration
 * strategy. The editor calls it with the current diagram payload and
 * expects a {@link DidSaveStatus} resolution.
 *
 * @category Integration
 */
export type OnSaveExternal = (data: IntegrationDataFormat, savingParams?: OnSaveParams) => Promise<DidSaveStatus>;
