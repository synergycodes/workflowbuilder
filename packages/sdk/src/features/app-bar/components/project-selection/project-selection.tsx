import { CaretDown } from '@phosphor-icons/react';
import { Input, Menu, type MenuItemProps, Tooltip } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from '../../app-bar.module.css';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { useStore } from '../../../../store/store';
import { removedPropertyWarning } from '../../../plugins-core/adapters/removed-api';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { composeMenuItems } from '../../../ui-extensions/compose-menu-items';
import { useIsHeaderControlShown, useRegisteredMenuItems } from '../../../ui-extensions/ui-extension-context';
import { useWarnOnce } from '../../../ui-extensions/use-warn-once';
import { getExportImportItems } from '../../functions/get-export-import-items';
import { VersionChip } from '../version-chip/version-chip';

/**
 * App-bar component that shows the current workflow's folder name + title
 * and lets the user rename the workflow inline. Its menu holds Export, Import,
 * Save as PDF (while supplied) and Settings; own menu items come through
 * {@link WorkflowMenuItem}, and `builtInControls` hides `folderName`, `workflowName`,
 * `export`, `import`, `saveAsPdf`, `settings` and `workflowRename`.
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
  const { setWorkflowName, openExport, openImport, openSettings, saveAsPdf } = useWorkflowBuilderActions();
  const [editName, setEditName] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNameTruncated, setIsNameTruncated] = useState(false);
  const isExportVisible = useIsBuiltInControlVisible('export');
  const isImportVisible = useIsBuiltInControlVisible('import');
  const isSettingsVisible = useIsBuiltInControlVisible('settings');
  const isWorkflowRenameVisible = useIsBuiltInControlVisible('workflowRename');
  const isFolderNameVisible = useIsBuiltInControlVisible('folderName');
  const isWorkflowNameVisible = useIsBuiltInControlVisible('workflowName');
  const isSaveAsPdfAvailable = useIsHeaderControlShown('saveAsPdf');
  const registeredItems = useRegisteredMenuItems('project');
  const isEditable = isWorkflowRenameVisible && !isReadOnly;

  const { t } = useTranslation();

  const items = useMemo(() => {
    const leadingItems: MenuItemProps[] = [
      ...getExportImportItems({ export: isExportVisible, import: isImportVisible }, { openExport, openImport }),
      ...(isSaveAsPdfAvailable
        ? [{ label: t('header.projectSelection.saveAsPdf'), icon: <Icon name="FilePdf" />, onClick: saveAsPdf }]
        : []),
    ];
    const settingsItems: MenuItemProps[] = isSettingsVisible
      ? [{ label: t('common.settings'), icon: <Icon name="Gear" />, onClick: openSettings }]
      : [];

    return composeMenuItems(
      [
        ...leadingItems,
        ...(leadingItems.length > 0 && settingsItems.length > 0 ? [{ type: 'separator' as const }] : []),
        ...settingsItems,
      ],
      registeredItems,
    );
  }, [
    isExportVisible,
    isImportVisible,
    isSettingsVisible,
    isSaveAsPdfAvailable,
    registeredItems,
    t,
    openExport,
    openImport,
    openSettings,
    saveAsPdf,
  ]);

  return (
    <div className={styles['project-selection']}>
      {isFolderNameVisible && <span className={styles['folder-name']}>{t('header.folderName')} /</span>}
      {isWorkflowNameVisible &&
        (editName && isEditable ? (
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
          <Tooltip>
            <Tooltip.Trigger asChild>
              <span
                className={clsx(styles['title'], { [styles['title-editable']]: isEditable })}
                onMouseEnter={(event) =>
                  setIsNameTruncated(event.currentTarget.scrollWidth > event.currentTarget.clientWidth)
                }
                onClick={isEditable ? () => setEditName(true) : undefined}
              >
                {workflowName}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>{isNameTruncated ? workflowName : null}</Tooltip.Content>
          </Tooltip>
        ))}
      <VersionChip />
      {items.length > 0 && (
        <div className={styles['menu-container']}>
          <Menu items={items} placement="bottom-start" open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Menu.TriggerButton
              size="xs"
              aria-label={t('tooltips.pickTheProject')}
              tooltip={t('tooltips.pickTheProject')}
            >
              <CaretDown />
            </Menu.TriggerButton>
          </Menu>
        </div>
      )}
    </div>
  );
}
