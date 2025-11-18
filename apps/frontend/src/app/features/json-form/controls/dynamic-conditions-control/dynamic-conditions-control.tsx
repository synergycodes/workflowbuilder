import clsx from 'clsx';
import { useCallback, useMemo, useRef } from 'react';
import { NavButton, TextArea } from '@synergycodes/overflow-ui';
import { useTranslation } from 'react-i18next';
import { DynamicCondition, DynamicConditionsControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';
import { ConditionsForm, ConditionsFormHandle } from './dynamic-conditions-form/conditions-form';
import { Icon } from '@workflow-builder/icons';
import styles from './dynamic-conditions-control.module.css';
import { conditionsToDependencies } from '../../utils/conditional-transform';
import { ConditionModalFooter } from './dynamic-condition-modal-footer/condition-modal-footer';
import { closeModal, openModal } from '@/features/modals/stores/use-modal-store';

function DynamicConditionsControl(props: DynamicConditionsControlProps) {
  const { data = [], handleChange, path, enabled } = props;
  const formRef = useRef<ConditionsFormHandle>(null);

  const { t } = useTranslation(undefined, { keyPrefix: 'conditions' });

  const dependencies = useMemo(() => {
    return conditionsToDependencies(data);
  }, [data]);

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
        <NavButton size="small" onClick={openEditorModal} tooltip={t('title')}>
          <Icon name="FrameCorners" size="small" />
        </NavButton>
      </div>
      <ControlWrapper {...props} uischema={{ ...props.uischema, label: t('dependencies') }}>
        <TextArea disabled={!enabled} value={dependencies.join(' ')} onClick={openEditorModal} size="medium" />
        <span className={styles['tag']}>{t('totalNumber', { count: data.length })}</span>
      </ControlWrapper>
    </div>
  );
}

export const dynamicConditionsControlRenderer = createControlRenderer('DynamicConditions', DynamicConditionsControl);
