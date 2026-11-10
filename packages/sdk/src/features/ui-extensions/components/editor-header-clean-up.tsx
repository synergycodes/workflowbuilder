import type { LayoutDirection } from '../../../node/common';
import { HeaderSupply, useLatestCallback } from '../header-supply';

/**
 * Props of {@link EditorHeaderCleanUp}.
 *
 * @category Components
 */
export type WorkflowBuilderCleanUpProps = {
  /**
   * Moves the nodes for the given direction. The SDK has already set and tracked a changed direction
   * before calling it; moving (and tracking) the nodes is the host's job. While a returned promise is
   * pending, Clean up shows as busy and ignores further calls. The latest function always runs.
   */
  onCleanUp: (direction: LayoutDirection) => void | Promise<void>;
};

/**
 * Supplies Clean up to the editor header: while it is mounted, the header shows Clean up and
 * `useWorkflowBuilderActions().cleanUp()` runs `onCleanUp`. Renders nothing itself. Render it
 * anywhere under `<WorkflowBuilder.Root>`, or from a plugin through `OptionalAppChildren`.
 *
 * @category Components
 */
export function EditorHeaderCleanUp({ onCleanUp }: WorkflowBuilderCleanUpProps) {
  const cleanUp = useLatestCallback(onCleanUp);

  return <HeaderSupply kind="cleanUp" value={cleanUp} componentName="EditorHeaderCleanUp" />;
}
