import { useTranslation } from 'react-i18next';
import { Button } from '@synergycodes/overflow-ui';
import { openHelpModal } from '../functions/open-help-modal';

export function FooterSupportButton() {
  const { t } = useTranslation();

  return (
    <Button variant="secondary" onClick={openHelpModal} size="small">
      {t('plugins.help.helpSupport')}
    </Button>
  );
}
