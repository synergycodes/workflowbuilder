import styles from './app-bar.module.css';
import { useTranslation } from 'react-i18next';
import { NavButton, Menu, MenuItemProps, IconSwitch } from '@synergycodes/axiom';
import {
  Archive,
  DotsThreeVertical,
  DownloadSimple,
  Export,
  Image,
  MoonStars,
  PencilSimple,
  PencilSimpleSlash,
  Sun,
  TreeStructure,
} from '@phosphor-icons/react';
import { useMemo } from 'react';
import { LanguageSelector } from '../translation/language-selector';
import { withOptionalPlugins } from '@/features/plugins/utils/adapter-components';

const ControlsMenu = withOptionalPlugins(Menu, 'ControlsMenu');

interface ControlsProps {
  layoutVertical: boolean;
  onLayoutChange: (isVertical: boolean) => void;
  onToggleReadOnly: (value: boolean) => void;
  onExport: () => void;
  onImport: () => void;
  onSaveAsImage: () => void;
  onArchive: () => void;
  isReadOnlyMode: boolean;
  isDarkMode: boolean;
  onThemeChange: (isDarkMode: boolean) => void;
}

export function Controls({
  layoutVertical,
  onLayoutChange,
  onExport,
  onImport,
  onSaveAsImage,
  onArchive,
  isDarkMode,
  onThemeChange,
  isReadOnlyMode,
  onToggleReadOnly,
}: ControlsProps) {
  const { t } = useTranslation();

  const items: MenuItemProps[] = useMemo(
    () => [
      {
        label: t('header.controls.export'),
        icon: <Export />,
        onClick: onExport,
      },
      {
        label: t('header.controls.import'),
        icon: <DownloadSimple />,
        onClick: onImport,
      },
      {
        label: t('header.controls.saveAsImage'),
        icon: <Image />,
        onClick: onSaveAsImage,
      },
      {
        type: 'separator',
      },
      {
        label: t('header.controls.archive'),
        icon: <Archive />,
        destructive: true,
        onClick: onArchive,
      },
    ],
    [onArchive, onExport, onImport, onSaveAsImage, t],
  );

  return (
    <div className={styles['controls']}>
      {/* This control is added temporarily for testing purposes. Its final position will be determined later. */}
      <LanguageSelector />
      <IconSwitch
        checked={layoutVertical}
        onChange={onLayoutChange}
        icon={<TreeStructure />}
        IconChecked={<TreeStructure className={styles['layout-icon-rotate']} />}
      />
      <IconSwitch
        checked={isReadOnlyMode}
        onChange={onToggleReadOnly}
        icon={<PencilSimple />}
        IconChecked={<PencilSimpleSlash />}
      />
      <IconSwitch
        checked={isDarkMode}
        onChange={onThemeChange}
        icon={<Sun />}
        IconChecked={<MoonStars />}
        variant="secondary"
      />

      <div className={styles['menu-container']}>
        <ControlsMenu items={items}>
          <NavButton tooltip={t('tooltips.menu')}>
            <DotsThreeVertical />
          </NavButton>
        </ControlsMenu>
      </div>
    </div>
  );
}
