import { CaretDown } from '@phosphor-icons/react';
import { Input, Menu, type MenuItemProps, Tooltip } from '@workflowbuilder/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from '../../app-bar.module.css';

import { openModalWorkflowSettings } from '../../../../features/variables/modals/modal-settings';
import { useStore } from '../../../../store/store';
import { withOptionalComponentPlugins } from '../../../plugins-core/adapters/adapter-components';
import { useAppBar } from '../../app-bar-context';
import { getControlsDotsItems } from '../../functions/get-controls-dots-items';
import { VersionChip } from '../version-chip/version-chip';

/**
 * Props accepted by {@link ProjectSelection}. Use this when typing a
 * `registerComponentDecorator<ProjectSelectionProps>('ProjectSelection', …)`
 * call.
 *
 * @category Components
 */
export type ProjectSelectionProps = {
  /**
   * Optional handler for the name menu's "Duplicate to Drafts" item. The item
   * is rendered only when this is provided — omit it and the item is absent.
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
  const isReadOnlyMode = useStore((store) => store.isReadOnlyMode);
  const setDocumentName = useStore((state) => state.setDocumentName);
  const [editName, setEditName] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNameTruncated, setIsNameTruncated] = useState(false);

  const { t } = useTranslation();
  const { onSaveAsPdf } = useAppBar();

  const items = useMemo<MenuItemProps[]>(() => {
    const decoratedItems = getControlsDotsItems();

    const leadingItems: MenuItemProps[] = [
      ...decoratedItems,
      ...(onSaveAsPdf
        ? [{ label: t('header.projectSelection.saveAsPdf'), icon: <Icon name="FilePdf" />, onClick: onSaveAsPdf }]
        : []),
    ];

    return [
      ...leadingItems,
      ...(leadingItems.length > 0 ? [{ type: 'separator' as const }] : []),
      {
        label: t('common.settings'),
        icon: <Icon name="Gear" />,
        onClick: openModalWorkflowSettings,
      },
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
    ];
  }, [onDuplicateClick, onSaveAsPdf, t]);

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
        <Tooltip>
          <Tooltip.Trigger asChild>
            <span
              className={styles['title']}
              onMouseEnter={(event) =>
                setIsNameTruncated(event.currentTarget.scrollWidth > event.currentTarget.clientWidth)
              }
              onClick={() => !isReadOnlyMode && setEditName(true)}
            >
              {documentName}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>{isNameTruncated ? documentName : null}</Tooltip.Content>
        </Tooltip>
      )}
      <VersionChip />
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
    </div>
  );
}

/**
 * @internal Decorate via {@link registerComponentDecorator}`<ProjectSelectionProps>('ProjectSelection', …)`
 * — direct mounts aren't supported and aren't part of the public API.
 */
export const ProjectSelection = withOptionalComponentPlugins(ProjectSelectionComponent, 'ProjectSelection');
