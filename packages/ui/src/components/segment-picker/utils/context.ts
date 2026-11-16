import type { NavButtonSize, NavButtonVariant } from '@ui/components/button/nav-button/types';
import { type MouseEvent, createContext } from 'react';

import type { SegmentPickerShape, SegmentPickerVariant } from '../types';

type SegmentPickerContextType = {
  selectedValue: string | undefined;
  onSelect: (event: MouseEvent<HTMLButtonElement>, value: string) => void;
  size: NavButtonSize;
  shape: SegmentPickerShape;
  variant: SegmentPickerVariant;
  navVariant: Exclude<NavButtonVariant, 'plain'>;
};

export const SegmentPickerContext = createContext<SegmentPickerContextType | undefined>(undefined);
