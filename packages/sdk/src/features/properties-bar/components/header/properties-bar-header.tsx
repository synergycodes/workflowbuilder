import { NavButton } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './properties-bar-header.module.css';

import { useTranslateIfPossible } from '../../../../hooks/use-translate-if-possible';
import type { WorkflowBuilderNode } from '../../../../node/node-data';
import { useStore } from '../../../../store/store';
import type { SingleSelectedElement } from '../../use-single-selected-element';
import { NodeHeading } from './node-heading';

type Props = {
  selection: SingleSelectedElement | null;
  headerLabel: string;
  isOpen: boolean;
  onTogglePropertiesBar: () => void;
  onDotsClick?: () => void;
};

export function PropertiesBarHeader({ selection, headerLabel, isOpen, onTogglePropertiesBar, onDotsClick }: Props) {
  const { t } = useTranslation();
  const toggleLabel = isOpen ? t('tooltips.closePropertiesBar') : t('tooltips.openPropertiesBar');

  return (
    <div className={styles['header']}>
      <div className={styles['heading']}>
        <SelectionHeading selection={selection} headerLabel={headerLabel} />
      </div>
      {onDotsClick && (
        <NavButton
          aria-label={t('tooltips.menu')}
          size="s"
          onClick={onDotsClick}
          prefixIcon={<Icon name="DotsThreeVertical" />}
        />
      )}
      <NavButton
        aria-label={toggleLabel}
        size="s"
        onClick={onTogglePropertiesBar}
        tooltip={toggleLabel}
        disabled={!selection}
        prefixIcon={<Icon name="SidebarSimple" />}
      />
    </div>
  );
}

type SelectionHeadingProps = Pick<Props, 'selection' | 'headerLabel'>;

function SelectionHeading({ selection, headerLabel }: SelectionHeadingProps) {
  const { t } = useTranslation();

  if (selection?.node) {
    return <SelectedNodeHeading node={selection.node} />;
  }

  if (!selection?.edge) {
    return <span className="wb-text-title-m-emphasized">{headerLabel}</span>;
  }

  const edgeType = t('propertiesBar.edge');
  const { label, icon } = selection.edge.data ?? {};

  return <NodeHeading label={label || edgeType} subtitle={edgeType} icon={icon ?? 'CaretRight'} />;
}

function SelectedNodeHeading({ node }: { node: WorkflowBuilderNode }) {
  const definition = useStore((store) => store.getNodeDefinition(node.data.type));
  const translateIfPossible = useTranslateIfPossible();

  const typeLabel = definition && (translateIfPossible(definition.label) || definition.label);
  const label = node.data.properties.label;

  return (
    <NodeHeading
      label={label || typeLabel || node.data.type}
      subtitle={label ? typeLabel : undefined}
      icon={definition?.icon ?? node.data.icon}
      accent={definition?.accent}
    />
  );
}
