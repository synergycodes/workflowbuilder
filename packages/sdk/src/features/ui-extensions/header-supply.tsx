import { useNodeId } from '@xyflow/react';
import { useCallback, useId, useLayoutEffect, useRef } from 'react';

import { useUiExtensionRegistry } from './ui-extension-context';
import type { HeaderSupplies, HeaderSupplyKind } from './ui-extension-registry';
import { useWarnOnce } from './use-warn-once';

type HeaderSupplyProps<K extends HeaderSupplyKind> = {
  kind: K;
  /** Must keep its identity between renders that do not change it, or every render notifies the header. */
  value: HeaderSupplies[K];
  /** The public component's name, for placement warnings. */
  componentName: string;
};

/**
 * Supplies one kind of host behaviour or data to the editor header while mounted and renders nothing
 * itself. When two are mounted, the later one is in use until it unmounts.
 */
export function HeaderSupply<K extends HeaderSupplyKind>({ kind, value, componentName }: HeaderSupplyProps<K>): null {
  const registry = useUiExtensionRegistry();
  const nodeId = useNodeId();
  const id = useId();
  useWarnOnce(
    registry === null,
    `[@workflowbuilder/sdk] <${componentName}> supplies nothing outside <WorkflowBuilder.Root>.`,
  );
  useWarnOnce(
    nodeId !== null,
    `[@workflowbuilder/sdk] <${componentName}> is rendered inside a canvas node, so every node supplies its own. Render it once, outside the canvas.`,
  );

  // Declared before the upsert, so on mount it still sees only the supplies mounted earlier.
  const hasWarnedAboutShadowing = useRef(false);
  useLayoutEffect(() => {
    if (!registry) return;
    if (registry.getHeaderSupply(kind) !== undefined && !hasWarnedAboutShadowing.current) {
      hasWarnedAboutShadowing.current = true;
      console.warn(
        `[@workflowbuilder/sdk] <${componentName}> is mounted more than once; the one mounted last is used.`,
      );
    }
    return () => registry.removeHeaderSupply(kind, id);
  }, [registry, kind, id, componentName]);

  useLayoutEffect(() => {
    registry?.upsertHeaderSupply(kind, id, value);
  }, [registry, kind, id, value]);

  return null;
}

/** A function that keeps its identity for the component's lifetime and always calls the latest `callback`. */
export function useLatestCallback<A extends unknown[], R>(callback: (...parameters: A) => R): (...parameters: A) => R {
  const latest = useRef(callback);
  useLayoutEffect(() => {
    latest.current = callback;
  });

  return useCallback((...parameters: A) => latest.current(...parameters), []);
}
