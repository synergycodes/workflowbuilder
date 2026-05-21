import clsx from 'clsx';
import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import styles from './template-selector.module.css';

import { getTemplates } from '../../../data/templates';
import { useFitView } from '../../../hooks/use-fit-view';
import type { DiagramModel } from '../../../node/common';
import { useStore } from '../../../store/store';
import { trackFutureChange } from '../../changes-tracker/stores/use-changes-tracker-store';
import { closeModal } from '../stores/use-modal-store';
import { Tile } from './components/tile';

export function TemplateSelector() {
  const { t } = useTranslation();
  const setDiagramModel = useStore((store) => store.setDiagramModel);
  const fitView = useFitView();

  const selectTemplate = useCallback(
    (model?: DiagramModel) => {
      setDiagramModel(model);
      fitView();
      closeModal();
    },
    [setDiagramModel, fitView],
  );

  return (
    <div className={styles['container']}>
      <section className={styles['header']}>
        <span className={clsx('ax-public-p10', styles['sub-title'])}>
          <Trans i18nKey="templateSelector.description" components={{ br: <br /> }} />
        </span>
      </section>
      <section className={styles['content']}>
        <div className={styles['templates']}>
          {getTemplates().map(({ icon, id, name, value }) => (
            <Tile
              icon={icon}
              key={id}
              title={name}
              subTitle={`${value.diagram.nodes.length} nodes`}
              onClick={() => {
                trackFutureChange('selectTemplate', { templateName: name });
                selectTemplate(value);
              }}
            />
          ))}
          <Tile icon="CornersOut" title={t('templateSelector.emptyCanvas')} outlined={true} onClick={selectTemplate} />
        </div>
      </section>
    </div>
  );
}
