import { Moon, SunDim } from '@phosphor-icons/react';
import { SegmentPicker } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function SegmentPickerExample() {
  const [view, setView] = useState('list');

  return (
    <ComponentPreview>
      <SegmentPicker value={view} onChange={(_event, next) => setView(next)}>
        <SegmentPicker.Item value="list">List</SegmentPicker.Item>
        <SegmentPicker.Item value="grid">Grid</SegmentPicker.Item>
        <SegmentPicker.Item value="board">Board</SegmentPicker.Item>
      </SegmentPicker>
    </ComponentPreview>
  );
}

export function SegmentPickerSecondaryExample() {
  const [theme, setTheme] = useState('light');

  return (
    <ComponentPreview>
      <SegmentPicker size="extra-small" variant="secondary" value={theme} onChange={(_event, next) => setTheme(next)}>
        <SegmentPicker.Item value="light" aria-label="Light" prefixIcon={<SunDim />} />
        <SegmentPicker.Item value="dark" aria-label="Dark" prefixIcon={<Moon />} />
      </SegmentPicker>
    </ComponentPreview>
  );
}
