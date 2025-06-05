import styles from './palette-footer.module.css';
import { useTranslation } from 'react-i18next';
import { Button } from '@synergycodes/axiom';

type Props = {
  onTemplateClick: () => void;
  onHelpClick: () => void;
};

export function PaletteFooter({ onTemplateClick, onHelpClick }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles['container']}>
      <Button variant="secondary" onClick={onTemplateClick} size="small">
        {t('palette.templates')}
      </Button>
      <Button variant="secondary" onClick={onHelpClick} size="small">
        {t('palette.helpSupport')}
      </Button>
    </div>
  );
}
