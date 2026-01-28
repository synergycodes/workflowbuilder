import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceholderButton } from '@/features/diagram/nodes/components/placeholder-button/placeholder-button';

import { DecisionBranch, DecisionBranchesControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { BranchCard } from './branch-card/branch-card';

function DecisionBranchesControl(props: DecisionBranchesControlProps) {
  const { data = [], handleChange, path, enabled } = props;

  const decisionBranches = data as DecisionBranch[];

  const { t } = useTranslation();

  const onUpdateBranch = useCallback(
    ({ conditions, label, index }: DecisionBranch) => {
      const updatedBranches = decisionBranches.map((branch) =>
        index === branch.index ? { ...branch, label, conditions } : branch,
      );
      handleChange(path, updatedBranches);
    },
    [decisionBranches, handleChange, path],
  );

  function onRemoveBranch(index: number) {
    const updatedBranches = decisionBranches.filter((branch) => branch.index !== index);
    handleChange(path, updatedBranches);
  }

  function onAddBranch() {
    handleChange(path, [...decisionBranches, { conditions: [], index: getNewIndex() }]);
  }

  function getNewIndex() {
    const maxIndex = Math.max(0, ...decisionBranches.map((branch) => branch.index ?? 0));
    return maxIndex + 1;
  }

  return (
    <div>
      {decisionBranches.map((branch) => (
        <BranchCard
          key={branch.index}
          branch={branch}
          onUpdate={onUpdateBranch}
          onRemove={onRemoveBranch}
          enabled={enabled}
        />
      ))}
      <PlaceholderButton onClick={onAddBranch} label={t('decisionBranches.addBranch')} />
    </div>
  );
}

export const decisionBranchesControlRenderer = createControlRenderer('DecisionBranches', DecisionBranchesControl);
