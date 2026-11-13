import { Button } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { useHeaderSupply, useIsHeaderControlShown } from '../../../ui-extensions/ui-extension-context';

export function PublishButton() {
  const { t } = useTranslation();
  const { publish } = useWorkflowBuilderActions();
  const isShown = useIsHeaderControlShown('publish');
  const version = useHeaderSupply('version');

  if (!isShown) {
    return null;
  }

  return (
    <Button size="s" disabled={!version?.isDraft} onClick={publish}>
      {version ? t('header.version.publish', { number: version.number }) : t('header.version.publishNoVersion')}
    </Button>
  );
}
