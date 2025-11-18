import clsx from 'clsx';
import { Icon } from '@workflow-builder/icons';
import styles from './saving-status.module.css';
import { useIntegrationStore } from '../../stores/use-integration-store';

export function SavingStatus() {
  // lastSaveAttemptTimestamp is used here as a key to reset the animation on each save
  const lastSaveAttemptTimestamp = useIntegrationStore((state) => state.lastSaveAttemptTimestamp);
  const savingStatus = useIntegrationStore((state) => state.savingStatus);

  if (savingStatus === 'saving') {
    return (
      <span className={clsx(styles['status'], styles['status--saving'])}>
        <Icon name="Spinner" />
      </span>
    );
  }

  if (savingStatus === 'saved') {
    return (
      <span key={lastSaveAttemptTimestamp} className={clsx(styles['status'], styles['status--saved'])}>
        <Icon name="CheckCircle" />
      </span>
    );
  }

  if (savingStatus === 'notSaved') {
    return (
      <span key={lastSaveAttemptTimestamp} className={clsx(styles['status'], styles['status--not-saved'])}>
        <Icon name="XCircle" />
      </span>
    );
  }

  return null;
}
