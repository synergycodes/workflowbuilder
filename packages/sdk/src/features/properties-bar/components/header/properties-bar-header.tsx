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
        {selection?.node ? (
          <SelectedNodeHeading node={selection.node} fallbackLabel={headerLabel} />
        ) : selection?.edge ? (
          <NodeHeading
            label={selection.edge.data?.label || t('propertiesBar.edge')}
            subtitle={t('propertiesBar.edge')}
            icon="CaretRight"
          />
        ) : (
          <span className="wb-text-title-m-emphasized">{headerLabel}</span>
        )}
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

type SelectedNodeHeadingProps = {
  node: WorkflowBuilderNode;
  fallbackLabel: string;
};

function SelectedNodeHeading({ node, fallbackLabel }: SelectedNodeHeadingProps) {
  const definition = useStore((store) => store.getNodeDefinition(node.data.type));
  const translateIfPossible = useTranslateIfPossible();

  const typeLabel = definition && (translateIfPossible(definition.label) || definition.label);
  const label = node.data.properties.label;

  return (
    <NodeHeading
      label={label || typeLabel || fallbackLabel}
      subtitle={label ? typeLabel : undefined}
      icon={definition?.icon ?? node.data.icon}
      accent={definition?.accent}
    />
  );
}
