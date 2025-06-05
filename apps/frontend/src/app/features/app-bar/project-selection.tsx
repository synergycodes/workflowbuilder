import styles from './app-bar.module.css';

import { NavButton, Menu, Input } from '@synergycodes/axiom';
import { useMemo, useState } from 'react';
import { Cards, CaretDown } from '@phosphor-icons/react';
import useStore from '@/store/store';
import { useTranslation } from 'react-i18next';

interface ProjectSelectionProps {
  documentName: string;
  onDuplicateClick: () => void;
  isReadOnlyMode: boolean;
}

export function ProjectSelection({ documentName, onDuplicateClick, isReadOnlyMode }: ProjectSelectionProps) {
  const setDocumentName = useStore((state) => state.setDocumentName);
  const [editName, setEditName] = useState<boolean>(false);

  const { t } = useTranslation();

  const items = useMemo(
    () => [
      {
        label: t('header.projectSelection.duplicateToDrafts'),
        icon: <Cards />,
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
