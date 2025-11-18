import { useTranslation } from 'react-i18next';
import styles from './branch-card.module.css';
import clsx from 'clsx';
import { NavButton } from '@synergycodes/overflow-ui';
import { SlidersHorizontal, Trash } from '@phosphor-icons/react';
import { useCallback, useRef } from 'react';
import {
  ConditionsForm,
  ConditionsFormHandle,
} from '../../dynamic-conditions-control/dynamic-conditions-form/conditions-form';
import { DecisionBranch } from '@/features/json-form/types/controls';
import { ConditionModalFooter } from '../../dynamic-conditions-control/dynamic-condition-modal-footer/condition-modal-footer';
import { closeModal, openModal } from '@/features/modals/stores/use-modal-store';

type Props = {
  branch: DecisionBranch;
  onUpdate: (branch: DecisionBranch) => void;
  onRemove: (index: number) => void;
};

export function BranchCard({ branch, onUpdate, onRemove }: Props) {
  const formRef = useRef<ConditionsFormHandle>(null);
  const { t } = useTranslation();
  const { conditions, index } = branch;
  const conditionCount = conditions.length;
  const conditionText = getConditionText();
  const hasNoConditions = conditionCount === 0;

  const handleConfirm = useCallback(() => {
    formRef.current?.handleConfirm();
  }, []);

  const openEditorModal = useCallback(
    ({ conditions }: DecisionBranch) => {
      openModal({
        content: (
          <ConditionsForm
            ref={formRef}
            onChange={(updatedConditions) => onUpdate({ index, conditions: updatedConditions })}
            value={conditions}
          />
        ),
        title: t('conditions.title'),
        footer: <ConditionModalFooter closeModal={closeModal} handleConfirm={handleConfirm} />,
      });
    },
    [t, handleConfirm, onUpdate, index],
  );

  const onClickEdit = useCallback(() => openEditorModal(branch), [branch, openEditorModal]);
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
      <div className={clsx(styles['conditions-chip'], { [styles['no-conditions']]: hasNoConditions }, 'ax-public-p11')}>
        {conditionText}
      </div>
    </div>
  );

  function getConditionText() {
    if (conditionCount === 1) {
      return t('decisionBranches.singleCondition');
    } else if (conditionCount > 1) {
      return t('decisionBranches.manyConditions', { count: conditionCount });
    } else {
      return t('decisionBranches.noConditions');
    }
  }
}
