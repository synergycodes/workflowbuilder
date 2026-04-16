import { NavButton } from '@synergycodes/overflow-ui';
import i18n from 'i18next';

import { Icon, WBIcon } from '@workflow-builder/icons';

import { TranslationKey } from '@/features/i18n/i18next';

import { openNoAccessModal } from '../../functions/open-no-access-modal';

export function getAppBarButton(icon: WBIcon, tooltip?: TranslationKey) {
  function mockAppBarButton() {
    return (
      <NavButton onClick={openNoAccessModal} tooltip={tooltip ? (i18n.t(tooltip) as string) : undefined}>
        <Icon name={icon} />
      </NavButton>
    );
  }

  Object.defineProperty(mockAppBarButton, 'name', { value: `mockAppBarButton` });

  return mockAppBarButton;
}
