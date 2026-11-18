import { useMemo } from 'react';

import type { WorkflowBuilderVersion } from '../../../workflow-builder-root/workflow-builder-root.types';
import { HeaderSupply } from '../header-supply';

/**
 * Supplies the workflow's version to the editor header: while it is mounted, the header shows the
 * version chip and `useWorkflowBuilderState().version` holds it. Renders nothing itself. Render it
 * anywhere under `<WorkflowBuilder.Root>`, or from a plugin through `OptionalAppChildren`.
 *
 * @category Components
 */
export function EditorHeaderVersion({ number, isDraft }: WorkflowBuilderVersion) {
  const version = useMemo(() => ({ number, isDraft }), [number, isDraft]);

  return <HeaderSupply kind="version" value={version} componentName="EditorHeaderVersion" />;
}
