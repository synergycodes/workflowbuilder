import { Tile } from './components/tile';
import { DiagramModel, TemplateModel } from '@workflow-builder/types/common';
import clsx from 'clsx';
import { Trans } from 'react-i18next';
import styles from './template-selector.module.css';
import { useTranslation } from 'react-i18next';

type TemplateSelectorProps = {
  data: TemplateModel[];
  selectTemplate: (model?: DiagramModel) => void;
};

export function TemplateSelector({ data, selectTemplate }: TemplateSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className={styles['container']}>
      <section className={styles['header']}>
        <span className={clsx('ax-public-p10', styles['sub-title'])}>
          <Trans i18nKey="templateSelector.description" components={{ br: <br /> }} />
        </span>
      </section>
      <section className={styles['content']}>
        <div className={styles['templates']}>
          {data.map(({ icon, id, name, value }) => (
            <Tile
              icon={icon}
              key={id}
              title={name}
              subTitle={`${value.diagram.nodes.length} nodes`}
              onClick={() => selectTemplate(value)}
            />
          ))}
          <Tile icon="CornersOut" title={t('templateSelector.emptyCanvas')} outlined={true} onClick={selectTemplate} />
        </div>
      </section>
    </div>
  );
}
