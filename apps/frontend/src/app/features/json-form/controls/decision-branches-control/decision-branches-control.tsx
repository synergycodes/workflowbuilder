import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { getStoreSingleSelected } from '@/store/slices/diagram-slice/actions';

import { PlaceholderButton } from '@/features/diagram/nodes/components/placeholder-button/placeholder-button';

import { DecisionBranch, DecisionBranchesControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { BranchCard } from './branch-card/branch-card';
import { createDecisionBranch } from './create-decision-branch';

function DecisionBranchesControl(props: DecisionBranchesControlProps) {
  const { data = [], handleChange, path, enabled } = props;

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
    const nodeId = getStoreSingleSelected()?.node?.id;
    if (!nodeId) {
      return;
    }

    handleChange(path, [...decisionBranches, createDecisionBranch(nodeId)]);
  }

  return (
    <div>
      {decisionBranches.map((branch, index) => (
        <BranchCard
          key={branch.id}
          index={index}
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
