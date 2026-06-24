import { SegmentPicker } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

export function SegmentPickerExample() {
  const [view, setView] = useState('list');

  return (
    <div className={frame.frame}>
      <SegmentPicker value={view} onChange={(_event, next) => setView(next)}>
        <SegmentPicker.Item value="list">List</SegmentPicker.Item>
        <SegmentPicker.Item value="grid">Grid</SegmentPicker.Item>
        <SegmentPicker.Item value="board">Board</SegmentPicker.Item>
      </SegmentPicker>
    </div>
  );
}
