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
import { withOptionalComponentPlugins } from '../../../plugins-core/adapters/adapter-components';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { composeMenuItems } from '../../../ui-extensions/compose-menu-items';
import { useRegisteredMenuItems } from '../../../ui-extensions/ui-extension-context';

/**
 * Props accepted by {@link ProjectSelection}. Use this when typing a
 * `registerComponentDecorator<ProjectSelectionProps>('ProjectSelection', …)`
 * call.
 *
 * @category Components
 */
export type ProjectSelectionProps = {
  /**
   * Optional handler for the kebab menu's "Duplicate to Drafts" item. The item
   * is rendered only when this is provided — omit it and the item is absent.
   *
   * @deprecated Use {@link ProjectMenuItem} instead.
   */
  onDuplicateClick?: () => void;
};

/**
 * App-bar component that shows the current document's folder name + title
 * and lets the user rename the document inline. Mounted automatically by
 * the editor's app bar.
 *
 * @internal — not part of the public API; use {@link ProjectSelectionProps}
 * to type a decorator on the `'ProjectSelection'` slot instead.
 */
function ProjectSelectionComponent({ onDuplicateClick }: ProjectSelectionProps) {
  const documentName = useStore((state) => state.documentName || '');
  const isReadOnly = useStore((store) => store.isReadOnly);
  const { renameDocument } = useWorkflowBuilderActions();
  const [editName, setEditName] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isSettingsVisible = useIsBuiltInControlVisible('settings');
  const isDocumentRenameVisible = useIsBuiltInControlVisible('documentRename');
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
          // Rendered only when the host wires a handler; without one it would be a
          // dead no-op item, so we leave it out entirely.
          ...(onDuplicateClick
            ? [
                {
                  label: t('header.projectSelection.duplicateToDrafts'),
                  icon: <Icon name="Cards" />,
                  onClick: onDuplicateClick,
                },
              ]
            : []),
        ],
        registeredItems,
      ),
    [isSettingsVisible, onDuplicateClick, t, registeredItems],
  );

  return (
    <div className={styles['project-selection']}>
      <span className={styles['folder-name']}>{t('header.folderName')} /</span>
      {editName && !isReadOnly ? (
        <Input
          value={documentName}
          onChange={(event) => renameDocument(event.target.value)}
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
          {documentName}
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

/**
 * @internal Decorate via {@link registerComponentDecorator}`<ProjectSelectionProps>('ProjectSelection', …)`
 * — direct mounts aren't supported and aren't part of the public API.
 */
export const ProjectSelection = withOptionalComponentPlugins(ProjectSelectionComponent, 'ProjectSelection');
