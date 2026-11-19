import downloadSimpleIcon from '@iconify-icons/ph/download-simple';
import { Button, SnackbarType } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../import-export-modal.module.css';

import { Icon } from '../../../../../icon/icon';
import { setStoreDataFromIntegration } from '../../../../../store/slices/diagram-slice/actions';
import { useStore } from '../../../../../store/store';
import { showTranslatedSnackbar } from '../../../../../utils/show-translated-snackbar';
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
      // Read-only can switch on while the modal is open: AI Studio sets it when a run starts.
      if (useStore.getState().isReadOnly) {
        closeModal();
        return;
      }

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

        showTranslatedSnackbar({
          title: 'loadDiagramSuccess',
          variant: SnackbarType.SUCCESS,
        });
      }
    },
    [jsonToParse],
  );

  return (
    <div className={styles['container']}>
      <p className={clsx('wb-text-body-s', styles['tip'])}>{t('importExport.importTip')}</p>
      <SyntaxHighlighterLazy value={jsonToParse} onChange={(json) => setJsonToParse(json || '{}')} />
      {(errors.length > 0 || warnings.length > 0) && (
        <div className={clsx('wb-text-body-s', styles['error'])}>
          {[...errors, ...warnings].map(({ message, messageParams }) => (
            <div key={message}>{t(message, messageParams) as string}</div>
          ))}
        </div>
      )}
      <div className={styles['actions']}>
        {warnings.length > 0 && errors.length === 0 && (
          <Button
            variant="secondary"
            prefixIcon={<Icon icon={downloadSimpleIcon} />}
            onClick={() => handleImport({ shouldIgnoreWarnings: true })}
          >
            {t('importExport.ignoreAndImport')}
          </Button>
        )}
        <Button
          variant="primary"
          prefixIcon={<Icon icon={downloadSimpleIcon} />}
          onClick={() => handleImport({ shouldIgnoreWarnings: false })}
        >
          {t('importExport.import')}
        </Button>
      </div>
    </div>
  );
}
