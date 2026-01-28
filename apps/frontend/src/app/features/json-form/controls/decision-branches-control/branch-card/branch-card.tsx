import { SlidersHorizontal, Trash } from '@phosphor-icons/react';
import { Input, NavButton } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './branch-card.module.css';

import { FormControlWithLabel } from '@/components/form/form-control-with-label/form-control-with-label';

import { DecisionBranch } from '@/features/json-form/types/controls';
import { closeModal, openModal } from '@/features/modals/stores/use-modal-store';

import { ConditionModalFooter } from '../../dynamic-conditions-control/dynamic-condition-modal-footer/condition-modal-footer';
import {
  ConditionsForm,
  ConditionsFormHandle,
} from '../../dynamic-conditions-control/dynamic-conditions-form/conditions-form';

type Props = {
  branch: DecisionBranch;
  onUpdate: (branch: DecisionBranch) => void;
  onRemove: (index: number) => void;
  enabled?: boolean;
};

export function BranchCard({ branch, onUpdate, onRemove, enabled = true }: Props) {
  const formRef = useRef<ConditionsFormHandle>(null);
  const { t } = useTranslation();
  const { label, conditions, index } = branch;
  const conditionCount = conditions.length;

  const handleConfirm = useCallback(() => {
    formRef.current?.handleConfirm();
  }, []);

  const onClickEdit = useCallback(() => {
    openModal({
      content: (
        <ConditionsForm
          ref={formRef}
          onChange={(updatedConditions) => onUpdate({ label, index, conditions: updatedConditions })}
          value={conditions}
        />
      ),
      title: t('conditions.title'),
      footer: <ConditionModalFooter closeModal={closeModal} handleConfirm={handleConfirm} />,
    });
  }, [conditions, t, handleConfirm, onUpdate, label, index]);

  const onLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ label: event.target.value, index, conditions });
    },
    [onUpdate, index, conditions],
  );

  const onClickRemove = useCallback(() => onRemove(branch.index), [onRemove, branch]);

  return (
    <div className={styles['branch-card']}>
      <div className={styles['header']}>
        <h1 className="ax-public-h10">{t('decisionBranches.branch', { index })}</h1>
        <div className={styles['actions']}>
          <NavButton onClick={onClickEdit}>
            <SlidersHorizontal weight="bold" />
          </NavButton>
          <NavButton onClick={onClickRemove}>
            <Trash weight="bold" />
          </NavButton>
        </div>
      </div>
      <div>
        <FormControlWithLabel label={t('decisionBranches.label')}>
          <Input
            value={label}
            placeholder={t('decisionBranches.branch', { index })}
            onChange={onLabelChange}
            disabled={!enabled}
          />
        </FormControlWithLabel>
      </div>
      <button
        className={clsx(styles['conditions-chip'], 'ax-public-p11', {
          [styles['no-conditions']]: conditionCount === 0,
        })}
        onClick={onClickEdit}
      >
        {t('conditions.totalNumber', { count: conditionCount })}
      </button>
    </div>
  );
}
