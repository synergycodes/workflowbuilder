import { useCallback } from 'react';
import { DecisionBranchesControlProps, DecisionBranch } from '../../types/controls';
import { useTranslation } from 'react-i18next';
import { PlaceholderButton } from '@/features/diagram/nodes/components/placeholder-button/placeholder-button';
import { createControlRenderer } from '../../utils/rendering';
import { BranchCard } from './branch-card/branch-card';

function DecisionBranchesControl(props: DecisionBranchesControlProps) {
  const { data = [], handleChange, path } = props;

  const decisionBranches = data as DecisionBranch[];

  const { t } = useTranslation();

  const onUpdateBranch = useCallback(
    ({ conditions, index }: DecisionBranch) => {
      const updatedBranches = decisionBranches.map((branch) =>
        index === branch.index ? { ...branch, conditions } : branch,
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
        <BranchCard key={branch.index} branch={branch} onUpdate={onUpdateBranch} onRemove={onRemoveBranch} />
      ))}
      <PlaceholderButton onClick={onAddBranch} label={t('decisionBranches.addBranch')} />
    </div>
  );
}

export const decisionBranchesControlRenderer = createControlRenderer('DecisionBranches', DecisionBranchesControl);
