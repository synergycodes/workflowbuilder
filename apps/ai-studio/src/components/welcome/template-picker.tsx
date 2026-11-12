import { PaletteFooterContent, useStore } from '@workflowbuilder/sdk';
import { Button } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import {
  closeTemplatePicker,
  markWelcomeSeen,
  openTemplatePicker,
  useTemplatePickerStore,
} from './template-picker-store';
import { WelcomeModal } from './welcome-modal';

// Takes the place of the SDK's Templates button (hidden through builtInControls) in the palette footer: after the
// first open, it is the only way back to the templates.
export function TemplatePicker() {
  const { open, variant } = useTemplatePickerStore();
  const isReadOnly = useStore((store) => store.isReadOnly);
  const { t } = useTranslation();

  function close() {
    if (variant === 'welcome') markWelcomeSeen();
    closeTemplatePicker();
  }

  return (
    <>
      <WelcomeModal variant={variant} open={open} onClose={close} />
      <PaletteFooterContent>
        <Button variant="ghost-secondary" size="s" disabled={isReadOnly} onClick={() => openTemplatePicker('select')}>
          {t('palette.templates')}
        </Button>
      </PaletteFooterContent>
    </>
  );
}
