import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './decision-branches-control.module.css';

import { PlaceholderButton } from '../../../diagram/nodes/components/placeholder-button/placeholder-button';
import { useIsControlEditable } from '../../hooks/use-is-control-editable';
import type { DecisionBranch, DecisionBranchesControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { BranchCard } from './branch-card/branch-card';
import { createDecisionBranch } from './create-decision-branch';

function DecisionBranchesControl(props: DecisionBranchesControlProps) {
  const { data = [], handleChange, path } = props;
  const isEditable = useIsControlEditable(props);

  const decisionBranches = data as DecisionBranch[];

  const { t } = useTranslation();

  const onUpdateBranch = useCallback(
    (id: string, partialBranch: Partial<DecisionBranch>) => {
      const updatedBranches = decisionBranches.map((branch) =>
        id === branch.id ? { ...branch, ...partialBranch } : branch,
      );
      handleChange(path, updatedBranches);
    },
    [decisionBranches, handleChange, path],
  );

  function onRemoveBranch(id: string) {
    const updatedBranches: DecisionBranch[] = decisionBranches.filter((branch) => branch.id !== id);
    handleChange(path, updatedBranches);
  }

  function onAddBranch() {
    if (!isEditable) {
      return;
    }
    handleChange(path, [...decisionBranches, createDecisionBranch()]);
  }

  return (
    <div className={styles['branches']}>
      {decisionBranches.map((branch, index) => (
        <BranchCard
          key={branch.id}
          index={index}
          branch={branch}
          onUpdate={onUpdateBranch}
          onRemove={onRemoveBranch}
          enabled={isEditable}
        />
      ))}
      <PlaceholderButton onClick={onAddBranch} label={t('decisionBranches.addBranch')} />
    </div>
  );
}

export const decisionBranchesControlRenderer = createControlRenderer('DecisionBranches', DecisionBranchesControl);
