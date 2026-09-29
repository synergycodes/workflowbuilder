import { create } from 'zustand';

type NoticeVariant = 'warning' | 'error' | 'success';

export type Notice = { id: number; text: string; variant: NoticeVariant };

type DiagramSourceStore = {
  /** The link's workflow, when the opened diagram belongs to it. */
  targetWorkflowId: string | undefined;
  /** The canvas shows a run from the address: it saves nowhere, so Reset reloads the page without it. */
  isRunView: boolean;
  notices: Notice[];
};

export const useDiagramSourceStore = create<DiagramSourceStore>()(() => ({
  targetWorkflowId: undefined,
  isRunView: false,
  notices: [],
}));

let nextNoticeId = 0;

export function addNotice(text: string, variant: NoticeVariant = 'warning'): void {
  useDiagramSourceStore.setState((state) => ({ notices: [...state.notices, { id: nextNoticeId++, text, variant }] }));
}

export function dismissNotice(id: number): void {
  useDiagramSourceStore.setState((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) }));
}
