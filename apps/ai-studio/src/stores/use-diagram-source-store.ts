import { create } from 'zustand';

type NoticeVariant = 'warning' | 'error' | 'success';

export type Notice = { text: string; variant: NoticeVariant };

type DiagramSourceStore = {
  /** The link's workflow, when the opened diagram belongs to it. */
  targetWorkflowId: string | undefined;
  /** The canvas shows a run from the address: it saves nowhere, so Reset reloads the page without it. */
  isRunView: boolean;
  /** Not yet handed to the editor's snackbars. */
  notices: Notice[];
};

export const useDiagramSourceStore = create<DiagramSourceStore>()(() => ({
  targetWorkflowId: undefined,
  isRunView: false,
  notices: [],
}));

export function addNotice(text: string, variant: NoticeVariant = 'warning'): void {
  useDiagramSourceStore.setState((state) => ({ notices: [...state.notices, { text, variant }] }));
}

export function takeNotices(): Notice[] {
  const { notices } = useDiagramSourceStore.getState();
  if (notices.length > 0) {
    useDiagramSourceStore.setState({ notices: [] });
  }

  return notices;
}
