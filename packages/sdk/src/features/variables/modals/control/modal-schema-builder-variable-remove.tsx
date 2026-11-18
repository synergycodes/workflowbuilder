import i18n from 'i18next';
import { useCallback } from 'react';

import { Icon } from '@workflow-builder/icons';

import styles from './modal-schema-builder-variable-config.module.css';

import { closeModal, openModal } from '../../../modals/stores/use-modal-store';
import {
  PaneRemoveVariable,
  type PaneRemoveVariableProps,
} from '../shared/components/pane-remove-variable/pane-remove-variable';

type Props = {
  isReadOnly: boolean;
  onRemove: () => void;
} & Pick<PaneRemoveVariableProps, 'onRemove' | 'variable' | 'nodesWithVariable'>;

function ModalSchemaBuilderVariableRemoval(props: Props) {
  const handleRemove = useCallback(() => {
    props.onRemove();
    closeModal();
  }, [props]);

  return (
    <div className={styles['container']}>
      <PaneRemoveVariable {...props} onRemove={handleRemove} title="" />
    </div>
  );
}

export function openModalSchemaBuilderVariableRemoval(props: Props) {
  openModal({
    content: <ModalSchemaBuilderVariableRemoval {...props} />,
    icon: <Icon name="MinusCircle" />,
    title: i18n.t('workflowsSettings.tab.removeVariable'),
  });
}
