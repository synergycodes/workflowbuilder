import { NavButton, Tooltip } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './node-variables-toggle.module.css';

import { Icon } from '../../../../../../packages/sdk/src';
import { NodeVariablesList } from './node-variables-list/node-variables-list';

type Props = {
  props?: {
    nodeId: string;
  };
};

function NodeVariablesPreviewToggle({ props }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const workflowBuilder = document.querySelector('.workflow-builder-root');
    const handleClick = () => setIsOpen(false);

    workflowBuilder?.addEventListener('click', handleClick);

    return () => workflowBuilder?.removeEventListener('click', handleClick);
  }, [isOpen]);

  if (!props?.nodeId) {
    return null;
  }

  return (
    <div
      className={clsx(styles['container'], {
        [styles['container--open']]: isOpen,
      })}
    >
      {isOpen && (
        <div data-tooltip-overlay className={styles['anchor-wrapper']}>
          <Tooltip placement="right-start" open>
            <Tooltip.Trigger>
              <span className={styles['anchor']}></span>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <div className={styles['dropdown']}>
                <header className={styles['dropdown-header']}>
                  <h3 className={styles['dropdown-title']}>Output data</h3>
                  <NavButton
                    className={styles['button-close']}
                    tooltip={t('common.remove')}
                    onClick={() => setIsOpen(false)}
                    size="s"
                  >
                    <Icon name="X" />
                  </NavButton>
                </header>
                <div className={styles['dropdown-content']}>
                  <p className={styles['dropdown-hint']}>
                    {'Read-only. To use a value, insert it with {{ in the target field.'}
                  </p>
                  <NodeVariablesList nodeId={props.nodeId} />
                </div>
              </div>
            </Tooltip.Content>
          </Tooltip>
        </div>
      )}
      <button className={clsx(styles['button'], { [styles['button--open']]: isOpen })} onClick={() => setIsOpen(true)}>
        <Icon name="Eye" />
        <span>Output data</span>
      </button>
    </div>
  );
}

export default NodeVariablesPreviewToggle;
