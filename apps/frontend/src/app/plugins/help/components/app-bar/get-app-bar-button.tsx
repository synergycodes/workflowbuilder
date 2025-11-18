import i18n from 'i18next';
import { Icon, WBIcon } from '@workflow-builder/icons';
import { NavButton } from '@synergycodes/overflow-ui';
import { openNoAccessModal } from '../../functions/open-no-access-modal';

export function getAppBarButton(icon: WBIcon, tooltip?: Parameters<typeof i18n.t>[0]) {
  return function mockAppBarButton() {
    return (
      <NavButton onClick={openNoAccessModal} tooltip={tooltip ? i18n.t(tooltip) : undefined}>
        <Icon name={icon} />
      </NavButton>
    );
  };
}
