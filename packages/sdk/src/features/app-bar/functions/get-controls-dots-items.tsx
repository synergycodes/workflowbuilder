import type { MenuItemProps } from '@workflowbuilder/ui';
import i18n from 'i18next';

import { Icon } from '@workflow-builder/icons';

import { openExportModal } from '../../integration/components/import-export/export-modal/open-export-modal';
import { openImportModal } from '../../integration/components/import-export/import-modal/open-import-modal';
import { withOptionalFunctionPlugins } from '../../plugins-core/adapters/adapter-functions';

function getControlsDotsItemsFunction(visible: { export: boolean; import: boolean }): MenuItemProps[] {
  return [
    ...(visible.export
      ? [
          {
            label: i18n.t('importExport.export'),
            icon: <Icon name="Export" />,
            onClick: openExportModal,
          },
        ]
      : []),
    ...(visible.import
      ? [
          {
            label: i18n.t('importExport.import'),
            icon: <Icon name="DownloadSimple" />,
            onClick: openImportModal,
          },
        ]
      : []),
  ];
}

export const getControlsDotsItems = withOptionalFunctionPlugins(getControlsDotsItemsFunction, 'getControlsDotsItems');
