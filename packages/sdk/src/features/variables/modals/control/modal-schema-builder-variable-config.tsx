import { SnackbarType } from '@synergycodes/overflow-ui';
import i18n from 'i18next';
import { useCallback } from 'react';

import { Icon } from '@workflow-builder/icons';

import styles from './modal-schema-builder-variable-config.module.css';

import { showSnackbar } from '../../../../utils/show-snackbar';
import { labelToFloorCase } from '../../../../utils/text';
import { closeModal, openModal } from '../../../modals/stores/use-modal-store';
import type { VariableDefinition, VariablesIndex } from '../../types';
import {
  PaneEditVariable,
  type PaneEditVariableProps,
} from '../shared/components/pane-edit-variable/pane-edit-variable';
import { VARIABLE_FORM_VARIANT } from '../shared/components/variable-form/variable-form';

type Props = {
  isReadOnly: boolean;
  variablesById: VariablesIndex;
} & Pick<PaneEditVariableProps, 'onSave' | 'variable' | 'variant'>;

function ModalSchemaBuilderVariableConfig(props: Props) {
  const handleSave: PaneEditVariableProps['onSave'] = useCallback(
    (definition: VariableDefinition) => {
      const floorIdForAPI = labelToFloorCase(definition.name);

      if (props.variant === VARIABLE_FORM_VARIANT.ADD && props.variablesById[floorIdForAPI]) {
        showSnackbar({
          title: 'variableNameAlreadyExists',
          variant: SnackbarType.ERROR,
        });

        throw 'variableNameAlreadyExists';
      }

      props.onSave({
        ...definition,
        id: floorIdForAPI,
      });

      closeModal();
    },
    [props],
  );

  return (
    <div className={styles['container']}>
      <PaneEditVariable {...props} onSave={handleSave} title="" />
    </div>
  );
}

export function openModalSchemaBuilderVariableConfig(props: Props) {
  openModal({
    content: <ModalSchemaBuilderVariableConfig {...props} />,
    icon: <Icon name={props.variant === VARIABLE_FORM_VARIANT.ADD ? 'PlusCircle' : 'PencilSimple'} />,
    title:
      props.variant === VARIABLE_FORM_VARIANT.ADD
        ? i18n.t('workflowsSettings.tab.addVariable')
        : i18n.t('workflowsSettings.tab.editVariable'),
  });
}
