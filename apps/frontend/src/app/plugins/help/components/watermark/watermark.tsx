import WatermarkImage from '../../assets/watermark.svg?react';
import styles from './watermark.module.css';

export function Watermark() {
  return (
    <a href="https://www.workflowbuilder.io/" className={styles['watermark']} title="Workflow Builder SDK">
      <WatermarkImage />
    </a>
  );
}
