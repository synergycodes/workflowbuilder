import { Button } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import styles from './palette-footer.module.css';

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
      {/* Bare text or an <input> from the deprecated slot is not a non-empty element, which the Sidebar's :has() rule needs to keep the footer. */}
      <div className={styles['deprecated-slot']}>
        <OptionalFooterContent>
          {isTemplatesVisible && (
            <Button disabled={isReadOnly} variant="ghost-secondary" onClick={onTemplateClick} size="s">
              {t('palette.templates')}
            </Button>
          )}
        </OptionalFooterContent>
      </div>
    </>
  );
}
