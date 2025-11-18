import styles from './palette-footer.module.css';
import { useTranslation } from 'react-i18next';
import { Button } from '@synergycodes/overflow-ui';
import { OptionalFooterContent } from '@/features/plugins-core/components/optional-footer-content';

type Props = {
  onTemplateClick: () => void;
};

export function PaletteFooter({ onTemplateClick }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles['container']}>
      <OptionalFooterContent>
        <Button variant="secondary" onClick={onTemplateClick} size="small">
          {t('palette.templates')}
        </Button>
      </OptionalFooterContent>
    </div>
  );
}
