import i18n from 'i18next';
import { MenuItemProps } from '@synergycodes/overflow-ui';
import { Icon } from '@workflow-builder/icons';
import { openNoAccessModal } from './open-no-access-modal';

export function addItemsToDots({ returnValue }: { returnValue: unknown }) {
  if (!Array.isArray(returnValue)) {
    return;
  }

  const items = returnValue as MenuItemProps[];

  const newItems: MenuItemProps[] = [
    {
      label: i18n.t('header.controls.saveAsImage'),
      icon: <Icon name="Image" />,
      onClick: openNoAccessModal,
    },
    {
      type: 'separator',
    },
    {
      label: i18n.t('header.controls.archive'),
      icon: <Icon name="Archive" />,
      destructive: true,
      onClick: openNoAccessModal,
    },
  ];

  return { replacedReturn: [...items, ...newItems] };
}
