import { Button } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { useAppBar } from '../../app-bar-context';

export function PublishButton() {
  const { t } = useTranslation();
  const { version, onPublish } = useAppBar();

  if (!onPublish) {
    return null;
  }

  return (
    <Button size="s" disabled={!version?.isDraft} onClick={onPublish}>
      {version ? t('header.version.publish', { number: version.number }) : t('header.version.publishNoVersion')}
    </Button>
  );
}
