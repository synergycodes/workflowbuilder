import { Button } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { useHeaderSupply } from '../../../ui-extensions/ui-extension-context';

export function PublishButton() {
  const { t } = useTranslation();
  const { publish } = useWorkflowBuilderActions();
  const isVisible = useIsBuiltInControlVisible('publish');
  const isSupplied = useHeaderSupply('publish') !== undefined;
  const version = useHeaderSupply('version');

  if (!isVisible || !isSupplied) {
    return null;
  }

  return (
    <Button size="s" disabled={!version?.isDraft} onClick={publish}>
      {version ? t('header.version.publish', { number: version.number }) : t('header.version.publishNoVersion')}
    </Button>
  );
}
