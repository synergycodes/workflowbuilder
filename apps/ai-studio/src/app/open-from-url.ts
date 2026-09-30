import * as openFromUrlApi from '../adapters/open-from-url-api';
import { knownNodeTypes } from '../data/known-node-types';
import { addNotice, useDiagramSourceStore } from '../stores/use-diagram-source-store';
import { isRunAlive, resetExecution, setExecutionStarted, useExecutionStore } from '../stores/use-execution-store';
import { syncExecutionIdToAddress } from '../utils/open-from-url/address-execution-id';
import { type OpenTarget, parseOpenTarget } from '../utils/open-from-url/parse-open-target';
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

// A bare address takes the remembered run, so the run is read one way whatever brought it. The stored id is
// checked like one from the address: anything on the origin can write that entry.
function withRememberedRun(target: OpenTarget): OpenTarget {
  if (target.executionId !== undefined || target.workflowId !== undefined) return target;
  const { executionId, status } = useExecutionStore.getState();
  if (executionId === undefined || !isRunAlive(status)) return target;
  const remembered = parseOpenTarget(new URLSearchParams({ executionId }).toString()).executionId;
  return remembered === undefined ? target : { ...target, executionId: remembered };
}

/** Opens no stream: it puts the run in the store, and `useBackendExecution`, the one opener, connects to it. */
async function open(search: string, deps: ResolveDeps): Promise<OpenedSource> {
  const named = parseOpenTarget(search);
  const target = withRememberedRun(named);
  const { source, notices, mayOpenOnRetry } = await resolveDiagramSource(target, deps);

  // The store holds exactly the run the canvas shows; any other remembered run belongs to another canvas.
  const runToOpen = source.kind === 'execution' ? source.executionId : undefined;
  if (runToOpen === undefined) {
    resetExecution();
    // A remembered run the server did not answer for moves into the address, so a reload retries it.
    if (named.executionId === undefined && target.executionId !== undefined && mayOpenOnRetry) {
      syncExecutionIdToAddress(target.executionId);
    }
  } else {
    setExecutionStarted(runToOpen, `/api/executions/${runToOpen}/stream`);
    if (named.executionId === undefined) syncExecutionIdToAddress(runToOpen);
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
