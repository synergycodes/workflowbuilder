import { NavButton } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './dynamic-conditions-control.module.css';

import { closeModal, openModal } from '../../../modals/stores/use-modal-store';
import type { DynamicCondition, DynamicConditionsControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { Dependencies } from './dependencies/dependencies';
import { ConditionModalFooter } from './dynamic-condition-modal-footer/condition-modal-footer';
import { ConditionsForm, type ConditionsFormHandle } from './dynamic-conditions-form/conditions-form';

function DynamicConditionsControl(props: DynamicConditionsControlProps) {
  const { data = [], handleChange, path, enabled, uischema } = props;
  const isDisabled = !enabled || uischema.disabled === true;
  const formRef = useRef<ConditionsFormHandle>(null);

  const { t } = useTranslation(undefined, { keyPrefix: 'conditions' });

  const onChange = useCallback(
    (value: DynamicCondition[]) => {
      handleChange(path, value);
    },
    [handleChange, path],
  );

  const handleConfirm = useCallback(() => {
    formRef.current?.handleConfirm();
  }, []);

  const openEditorModal = useCallback(() => {
    openModal({
      content: <ConditionsForm ref={formRef} onChange={onChange} value={data} />,
      title: t('title'),
      footer: <ConditionModalFooter closeModal={closeModal} handleConfirm={handleConfirm} />,
    });
  }, [data, onChange, formRef, handleConfirm, t]);

  return (
    <div className={styles['container']}>
      <div className={styles['header']}>
        <span className={clsx('ax-public-h10', styles['title'])}>{t('title')}</span>
        <NavButton size="small" onClick={openEditorModal} tooltip={t('title')} disabled={isDisabled}>
          <Icon name="FrameCorners" size="small" />
        </NavButton>
      </div>
      <Dependencies conditions={data} onClick={openEditorModal} disabled={isDisabled} />
      <span className={styles['tag']}>{t('totalNumber', { count: data.length })}</span>
    </div>
  );
}

export const dynamicConditionsControlRenderer = createControlRenderer('DynamicConditions', DynamicConditionsControl);
