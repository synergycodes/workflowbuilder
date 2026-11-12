import { HeaderSupply } from '../header-supply';
import { useLatestCallback } from '../use-latest-callback';

/**
 * Props of {@link EditorHeaderPublish}.
 *
 * @category Components
 */
export type WorkflowBuilderPublishProps = {
  /** Publishes the current draft. The latest function always runs. */
  onPublish: () => void;
};

/**
 * Supplies Publish to the editor header: while it is mounted, the header shows Publish and
 * `useWorkflowBuilderActions().publish()` runs `onPublish` while the supplied version is a draft
 * (see `EditorHeaderVersion`). Renders nothing itself. Render it anywhere under
 * `<WorkflowBuilder.Root>`, or from a plugin through `OptionalAppChildren`.
 *
 * @category Components
 */
export function EditorHeaderPublish({ onPublish }: WorkflowBuilderPublishProps) {
  const publish = useLatestCallback(onPublish);

  return <HeaderSupply kind="publish" value={publish} componentName="EditorHeaderPublish" />;
}
