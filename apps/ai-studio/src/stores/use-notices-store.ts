import { create } from 'zustand';

type NoticeVariant = 'warning' | 'error' | 'success';

export type Notice = { text: string; variant: NoticeVariant };

/** Notices not yet handed to the editor's snackbars, which show nothing until the editor has mounted. */
export const useNoticesStore = create<{ notices: Notice[] }>()(() => ({ notices: [] }));

export function addNotice(text: string, variant: NoticeVariant = 'warning'): void {
  useNoticesStore.setState((state) => ({ notices: [...state.notices, { text, variant }] }));
}

export function takeNotices(): Notice[] {
  const { notices } = useNoticesStore.getState();
  if (notices.length > 0) {
    useNoticesStore.setState({ notices: [] });
  }

  return notices;
}
