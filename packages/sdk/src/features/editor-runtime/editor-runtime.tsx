import { useEditorRuntime } from './use-editor-runtime';

// Render boundary: isolates `useAutoSave`'s every-diagram-change subscription from RootShell.
export function EditorRuntime() {
  useEditorRuntime();
  return null;
}
