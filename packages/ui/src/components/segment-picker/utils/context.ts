import type { NavButtonShape, NavButtonSize } from '@ui/components/button/nav-button/types';
import { type MouseEvent, createContext } from 'react';

import type { SegmentPickerShape, SegmentPickerVariant } from '../types';

type SegmentPickerContextType = {
  selectedValue: string | undefined;
  onSelect: (value: string, event: MouseEvent<HTMLButtonElement>) => void;
  size: NavButtonSize;
  shape: SegmentPickerShape;
  variant: SegmentPickerVariant;
  navShape: NavButtonShape;
};

export const SegmentPickerContext = createContext<SegmentPickerContextType | undefined>(undefined);
