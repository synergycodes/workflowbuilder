import downloadSimpleIcon from '@iconify-icons/ph/download-simple';
import exportIcon from '@iconify-icons/ph/export';
import type { MenuItemProps } from '@workflowbuilder/ui';
import i18n from 'i18next';

import type { WorkflowBuilderActions } from '../../../hooks/use-workflow-builder-actions';
import { Icon } from '../../../icon/icon';

export function getExportImportItems(
  visible: { export: boolean; import: boolean },
  { openExport, openImport }: Pick<WorkflowBuilderActions, 'openExport' | 'openImport'>,
  isReadOnly: boolean,
): MenuItemProps[] {
  return [
    ...(visible.export
      ? [
          {
            label: i18n.t('importExport.export'),
            icon: <Icon icon={exportIcon} />,
            onClick: openExport,
          },
        ]
      : []),
    ...(visible.import
      ? [
          {
            label: i18n.t('importExport.import'),
            icon: <Icon icon={downloadSimpleIcon} />,
            onClick: openImport,
            disabled: isReadOnly,
          },
        ]
      : []),
  ];
}
