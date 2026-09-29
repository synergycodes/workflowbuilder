import { Snackbar } from '@workflowbuilder/ui';
import { useEffect } from 'react';

import styles from './open-notices.module.css';

import { type Notice, dismissNotice, useDiagramSourceStore } from '../../stores/use-diagram-source-store';

const SUCCESS_LIFETIME_MS = 3000;

function OpenNotice({ notice }: { notice: Notice }) {
  useEffect(() => {
    if (notice.variant !== 'success') return;
    const timer = setTimeout(() => dismissNotice(notice.id), SUCCESS_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return <Snackbar variant={notice.variant} title={notice.text} close onClose={() => dismissNotice(notice.id)} />;
}

export function OpenNotices() {
  const notices = useDiagramSourceStore((state) => state.notices);
  if (notices.length === 0) return null;

  return (
    <div className={styles['list']}>
      {notices.map((notice) => (
        <OpenNotice key={notice.id} notice={notice} />
      ))}
    </div>
  );
}
