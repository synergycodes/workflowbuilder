import { Button } from '@synergycodes/overflow-ui';
import { useTranslation } from 'react-i18next';

type Props = {
  closeModal: () => void;
  handleConfirm: () => void;
};

export function ConditionModalFooter({ closeModal, handleConfirm }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <Button variant="secondary" onClick={closeModal} type="button">
        {t('conditions.cancel')}
      </Button>
      <Button onClick={handleConfirm}>{t('conditions.confirm')}</Button>
    </>
  );
}
