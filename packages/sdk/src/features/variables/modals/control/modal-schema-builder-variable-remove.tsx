import minusCircleIcon from '@iconify-icons/ph/minus-circle';
import i18n from 'i18next';
import { useCallback } from 'react';

import styles from './modal-schema-builder-variable-config.module.css';

import { Icon } from '../../../../icon/icon';
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
    icon: <Icon icon={minusCircleIcon} />,
    title: i18n.t('workflowsSettings.tab.removeVariable'),
  });
}
