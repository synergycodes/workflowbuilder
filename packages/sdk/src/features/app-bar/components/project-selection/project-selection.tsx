import { CaretDown } from '@phosphor-icons/react';
import { Input, Menu } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from '../../app-bar.module.css';

import { openModalWorkflowSettings } from '../../../../features/variables/modals/modal-settings';
import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { useStore } from '../../../../store/store';
import { removedPropertyWarning } from '../../../plugins-core/adapters/removed-api';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { composeMenuItems } from '../../../ui-extensions/compose-menu-items';
import { useRegisteredMenuItems } from '../../../ui-extensions/ui-extension-context';
import { useWarnOnce } from '../../../ui-extensions/use-warn-once';

/**
 * App-bar component that shows the current document's folder name + title
 * and lets the user rename the document inline. Mounted by the editor's app
 * bar; own menu items come through {@link WorkflowMenuItem}, and
 * `builtInControls` hides `settings` and `workflowRename`.
 *
 * @internal — not part of the public API.
 */
export function ProjectSelection(props: object) {
  // The props are empty since 4.0; the check catches an `onDuplicateClick` a caller still passes.
  useWarnOnce(
    'onDuplicateClick' in props,
    removedPropertyWarning('onDuplicateClick', 'ProjectSelection', 'WorkflowMenuItem'),
  );
  const workflowName = useStore((state) => state.workflowName || '');
  const isReadOnly = useStore((store) => store.isReadOnly);
  const { setWorkflowName } = useWorkflowBuilderActions();
  const [editName, setEditName] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isSettingsVisible = useIsBuiltInControlVisible('settings');
  const isDocumentRenameVisible = useIsBuiltInControlVisible('workflowRename');
  const registeredItems = useRegisteredMenuItems('project');

  const { t } = useTranslation();

  const items = useMemo(
    () =>
      composeMenuItems(
        [
          ...(isSettingsVisible
            ? [
                {
                  label: t('common.settings'),
                  icon: <Icon name="Gear" />,
                  onClick: openModalWorkflowSettings,
                },
              ]
            : []),
        ],
        registeredItems,
      ),
    [isSettingsVisible, t, registeredItems],
  );

  return (
    <div className={styles['project-selection']}>
      <span className={styles['folder-name']}>{t('header.folderName')} /</span>
      {editName && isDocumentRenameVisible && !isReadOnly ? (
        <Input
          value={workflowName}
          onChange={(event) => setWorkflowName(event.target.value)}
          onBlur={() => setEditName(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          autoFocus={true}
        />
      ) : (
        <span
          className={clsx(styles['title'], { [styles['title-editable']]: isDocumentRenameVisible && !isReadOnly })}
          onClick={isDocumentRenameVisible && !isReadOnly ? () => setEditName(true) : undefined}
        >
          {workflowName}
        </span>
      )}
      {items.length > 0 && (
        <div className={styles['menu-container']}>
          <Menu items={items} open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Menu.TriggerButton aria-label={t('tooltips.pickTheProject')} tooltip={t('tooltips.pickTheProject')}>
              <CaretDown />
            </Menu.TriggerButton>
          </Menu>
        </div>
      )}
    </div>
  );
}
