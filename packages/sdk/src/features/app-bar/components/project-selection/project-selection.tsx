import { CaretDown } from '@phosphor-icons/react';
import { Input, Menu, NavButton } from '@workflowbuilder/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from '../../app-bar.module.css';

import { openModalWorkflowSettings } from '../../../../features/variables/modals/modal-settings';
import { useStore } from '../../../../store/store';
import { withOptionalComponentPlugins } from '../../../plugins-core/adapters/adapter-components';

/**
 * Props accepted by {@link ProjectSelection}. Use this when typing a
 * `registerComponentDecorator<ProjectSelectionProps>('ProjectSelection', …)`
 * call.
 *
 * @category Components
 */
export type ProjectSelectionProps = {
  /** Optional handler wired into the kebab menu's "Duplicate to drafts" item. */
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
  const isReadOnlyMode = useStore((store) => store.isReadOnlyMode);
  const setDocumentName = useStore((state) => state.setDocumentName);
  const [editName, setEditName] = useState<boolean>(false);

  const { t } = useTranslation();

  const items = useMemo(
    () => [
      {
        label: t('common.settings'),
        icon: <Icon name="Gear" />,
        onClick: openModalWorkflowSettings,
      },
      {
        label: t('header.projectSelection.duplicateToDrafts'),
        icon: <Icon name="Cards" />,
        onClick: onDuplicateClick,
      },
    ],
    [onDuplicateClick, t],
  );

  return (
    <div className={styles['project-selection']}>
      <span className={styles['folder-name']}>{t('header.folderName')} /</span>
      {editName && !isReadOnlyMode ? (
        <Input
          value={documentName}
          onChange={(event) => {
            if (event.target.value.length > 128) return;
            setDocumentName(event.target.value);
          }}
          onBlur={() => setEditName(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          autoFocus={true}
        />
      ) : (
        <span className={styles['title']} onClick={() => !isReadOnlyMode && setEditName(true)}>
          {documentName}
        </span>
      )}
      <div className={styles['menu-container']}>
        <Menu items={items}>
          <NavButton tooltip={t('tooltips.pickTheProject')}>
            <CaretDown />
          </NavButton>
        </Menu>
      </div>
    </div>
  );
}

/**
 * @internal Decorate via {@link registerComponentDecorator}`<ProjectSelectionProps>('ProjectSelection', …)`
 * — direct mounts aren't supported and aren't part of the public API.
 */
export const ProjectSelection = withOptionalComponentPlugins(ProjectSelectionComponent, 'ProjectSelection');
