import { create } from 'zustand';

type NoticeTone = 'warning' | 'critical' | 'success';

export type Notice = { text: string; tone: NoticeTone };

/** Notices not yet handed to the editor's snackbars, which show nothing until the editor has mounted. */
export const useNoticesStore = create<{ notices: Notice[] }>()(() => ({ notices: [] }));

export function addNotice(text: string, tone: NoticeTone = 'warning'): void {
  useNoticesStore.setState((state) => ({ notices: [...state.notices, { text, tone }] }));
}

export function takeNotices(): Notice[] {
  const { notices } = useNoticesStore.getState();
  if (notices.length > 0) {
    useNoticesStore.setState({ notices: [] });
  }

  return notices;
}
