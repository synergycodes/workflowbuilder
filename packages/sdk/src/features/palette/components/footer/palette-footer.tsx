import { Button } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { useStore } from '../../../../store/store';
import { OptionalFooterContent } from '../../../plugins-core/components/app/optional-footer-content';
import { AreaTarget } from '../../../ui-extensions/area-target';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';

type Props = {
  onTemplateClick: () => void;
};

export function PaletteFooter({ onTemplateClick }: Props) {
  const isReadOnly = useStore((store) => store.isReadOnly);
  const isTemplatesVisible = useIsBuiltInControlVisible('templates');
  const { t } = useTranslation();

  return (
    <>
      <AreaTarget area="paletteFooter" />
      <OptionalFooterContent>
        {isTemplatesVisible && (
          <Button disabled={isReadOnly} variant="ghost-secondary" onClick={onTemplateClick} size="s">
            {t('palette.templates')}
          </Button>
        )}
      </OptionalFooterContent>
    </>
  );
}
