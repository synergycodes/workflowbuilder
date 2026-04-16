import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { LayoutDirection } from '@workflow-builder/types/common';

import styles from './branches-container.module.css';

import { DecisionBranch } from '@/features/json-form/types/controls';

import { ConnectableItem } from '../../components/connectable-item/connectable-item';
import { NodeSection } from '../../components/node-section/node-section';
import { PlaceholderButton } from '../../components/placeholder-button/placeholder-button';

type Props = {
  decisionBranches: DecisionBranch[];
  layoutDirection?: LayoutDirection;
  onAddBranch?: () => void;
};

export function BranchesContainer({ decisionBranches, layoutDirection, onAddBranch }: Props) {
  const { t } = useTranslation(undefined, { keyPrefix: 'decisionBranches' });
  // Branches should be displayed vertically when layout direction is horizontal (sic!)
  const isListVertical = layoutDirection === 'RIGHT';

  return (
    <NodeSection label={t('branches')}>
      <div className={clsx(styles['branches-container'], { [styles['vertical']]: isListVertical })}>
        {decisionBranches.map(({ id, sourceHandle, label }, index) => (
          <ConnectableItem key={id} label={label || t('branch', { index: index + 1 })} handleId={sourceHandle} />
        ))}
        <PlaceholderButton label={t('addBranch')} onClick={onAddBranch} />
      </div>
    </NodeSection>
  );
}
