import styles from './watermark.module.css';

import WatermarkImage from '../../assets/watermark.svg?react';

export function Watermark() {
  return (
    <a href="https://www.workflowbuilder.io/" className={styles['watermark']} title="Workflow Builder SDK">
      <WatermarkImage />
    </a>
  );
}
