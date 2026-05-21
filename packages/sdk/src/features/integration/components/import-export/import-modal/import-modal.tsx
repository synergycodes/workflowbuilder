import { Button, SnackbarType } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from '../import-export-modal.module.css';

import { setStoreDataFromIntegration } from '../../../../../store/slices/diagram-slice/actions';
import { showSnackbar } from '../../../../../utils/show-snackbar';
import { trackFutureChange } from '../../../../changes-tracker/stores/use-changes-tracker-store';
import { closeModal } from '../../../../modals/stores/use-modal-store';
import { SyntaxHighlighterLazy } from '../../../../syntax-highlighter/components/syntax-highlighter-lazy';
import { type IntegrationDataError, validateIntegrationData } from '../../../utils/validate-integration-data';

export function ImportModal() {
  const [jsonToParse, setJsonToParse] = useState('{}');
  const [{ errors, warnings }, setJsonValidation] = useState<{
    errors: IntegrationDataError[];
    warnings: IntegrationDataError[];
  }>({
    errors: [],
    warnings: [],
  });
  const { t } = useTranslation();

  const handleImport = useCallback(
    ({ shouldIgnoreWarnings }: { shouldIgnoreWarnings: boolean }) => {
      const { errors, warnings, validatedIntegrationData } = validateIntegrationData(jsonToParse);

      setJsonValidation({
        errors,
        warnings,
      });

      if (errors.length > 0) {
        return;
      }

      if (warnings.length > 0 && shouldIgnoreWarnings === false) {
        return;
      }

      if (validatedIntegrationData) {
        trackFutureChange('import');
        setStoreDataFromIntegration(validatedIntegrationData);
        closeModal();

        showSnackbar({
          title: 'loadDiagramSuccess',
          variant: SnackbarType.SUCCESS,
        });
      }
    },
    [jsonToParse],
  );

  return (
    <div className={styles['container']}>
      <p className={clsx('ax-public-p10', styles['tip'])}>{t('importExport.importTip')}</p>
      <SyntaxHighlighterLazy value={jsonToParse} onChange={(json) => setJsonToParse(json || '{}')} />
      {(errors.length > 0 || warnings.length > 0) && (
        <div className={clsx('ax-public-p10', styles['error'])}>
          {[...errors, ...warnings].map(({ message, messageParams }) => (
            <div key={message}>{t(message, messageParams) as string}</div>
          ))}
        </div>
      )}
      <div className={styles['actions']}>
        {warnings.length > 0 && errors.length === 0 && (
          <Button variant="warning" onClick={() => handleImport({ shouldIgnoreWarnings: true })}>
            <Icon name="DownloadSimple" />
            {t('importExport.ignoreAndImport')}
          </Button>
        )}
        <Button variant="primary" onClick={() => handleImport({ shouldIgnoreWarnings: false })}>
          <Icon name="DownloadSimple" />
          {t('importExport.import')}
        </Button>
      </div>
    </div>
  );
}
