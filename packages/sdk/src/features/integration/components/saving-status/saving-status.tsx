import checkCircleIcon from '@iconify-icons/ph/check-circle';
import spinnerIcon from '@iconify-icons/ph/spinner';
import xCircleIcon from '@iconify-icons/ph/x-circle';
import clsx from 'clsx';

import styles from './saving-status.module.css';

import { Icon } from '../../../../icon/icon';
import { useIntegrationStore } from '../../stores/use-integration-store';

export function SavingStatus() {
  // lastSaveAttemptTimestamp is used here as a key to reset the animation on each save
  const lastSaveAttemptTimestamp = useIntegrationStore((state) => state.lastSaveAttemptTimestamp);
  const savingStatus = useIntegrationStore((state) => state.savingStatus);

  if (savingStatus === 'saving') {
    return (
      <span className={clsx(styles['status'], styles['status--saving'])}>
        <Icon icon={spinnerIcon} size="inherit" />
      </span>
    );
  }

  if (savingStatus === 'saved') {
    return (
      <span key={lastSaveAttemptTimestamp} className={clsx(styles['status'], styles['status--saved'])}>
        <Icon icon={checkCircleIcon} />
      </span>
    );
  }

  if (savingStatus === 'notSaved') {
    return (
      <span key={lastSaveAttemptTimestamp} className={clsx(styles['status'], styles['status--not-saved'])}>
        <Icon icon={xCircleIcon} />
      </span>
    );
  }

  return null;
}
