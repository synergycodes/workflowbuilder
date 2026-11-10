import { HeaderSupply, useLatestCallback } from '../header-supply';

/**
 * Props of {@link EditorHeaderSaveAsPdf}.
 *
 * @category Components
 */
export type WorkflowBuilderSaveAsPdfProps = {
  /** Produces the PDF. The latest function always runs. */
  onSaveAsPdf: () => void;
};

/**
 * Supplies Save as PDF to the editor header: while it is mounted, the workflow menu shows Save as
 * PDF and `useWorkflowBuilderActions().saveAsPdf()` runs `onSaveAsPdf`. Renders nothing itself.
 * Render it anywhere under `<WorkflowBuilder.Root>`, or from a plugin through `OptionalAppChildren`.
 *
 * @category Components
 */
export function EditorHeaderSaveAsPdf({ onSaveAsPdf }: WorkflowBuilderSaveAsPdfProps) {
  const saveAsPdf = useLatestCallback(onSaveAsPdf);

  return <HeaderSupply kind="saveAsPdf" value={saveAsPdf} componentName="EditorHeaderSaveAsPdf" />;
}
