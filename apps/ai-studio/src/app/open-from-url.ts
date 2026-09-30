import * as openFromUrlApi from '../adapters/open-from-url-api';
import { knownNodeTypes } from '../data/known-node-types';
import { addNotice, useDiagramSourceStore } from '../stores/use-diagram-source-store';
import { resetExecution, setExecutionStarted } from '../stores/use-execution-store';
import { parseOpenTarget } from '../utils/open-from-url/parse-open-target';
import {
  type OpenedSource,
  type ResolveDeps,
  resolveDiagramSource,
} from '../utils/open-from-url/resolve-diagram-source';

const liveDeps: ResolveDeps = {
  fetchWorkflow: openFromUrlApi.fetchWorkflow,
  fetchExecutionSnapshot: openFromUrlApi.fetchExecutionSnapshot,
  knownTypes: knownNodeTypes,
};

function targetOf(source: OpenedSource): string | undefined {
  if (source.kind === 'workflow') return source.workflowId;
  if (source.kind === 'execution') return source.targetWorkflowId;
  return undefined;
}

/** Opens no stream: it puts the run in the store, and `useBackendExecution`, the one opener, connects to it. */
async function open(search: string, deps: ResolveDeps): Promise<OpenedSource> {
  const { source, notices } = await resolveDiagramSource(parseOpenTarget(search), deps);

  if (source.kind === 'execution') {
    setExecutionStarted(source.executionId, `/api/executions/${source.executionId}/stream`);
  } else {
    resetExecution();
  }

  useDiagramSourceStore.setState({ targetWorkflowId: targetOf(source), isRunView: source.kind === 'execution' });
  for (const text of notices) addNotice(text);

  return source;
}

/** Never rejects, so the editor always mounts: a lookup that fails opens the local draft. */
export async function openFromUrl(search: string, deps: ResolveDeps = liveDeps): Promise<OpenedSource> {
  try {
    return await open(search, deps);
  } catch {
    resetExecution();
    addNotice('The link could not be opened. Showing your local draft instead.');
    return { kind: 'local' };
  }
}
