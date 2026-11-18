import type { MenuItemProps } from '@workflowbuilder/ui';
import i18n from 'i18next';

import { Icon } from '@workflow-builder/icons';

import type { WorkflowBuilderActions } from '../../../hooks/use-workflow-builder-actions';

export function getExportImportItems(
  visible: { export: boolean; import: boolean },
  { openExport, openImport }: Pick<WorkflowBuilderActions, 'openExport' | 'openImport'>,
): MenuItemProps[] {
  return [
    ...(visible.export
      ? [
          {
            label: i18n.t('importExport.export'),
            icon: <Icon name="Export" />,
            onClick: openExport,
          },
        ]
      : []),
    ...(visible.import
      ? [
          {
            label: i18n.t('importExport.import'),
            icon: <Icon name="DownloadSimple" />,
            onClick: openImport,
          },
        ]
      : []),
  ];
}
