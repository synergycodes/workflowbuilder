import type { NavButtonSize, NavButtonVariant } from '@ui/components/button/nav-button/types';
import type { Shape } from '@ui/components/button/types';
import { type MouseEvent, createContext } from 'react';

type SegmentPickerContextType = {
  selectedValue: string | undefined;
  onSelect: (event: MouseEvent<HTMLButtonElement>, value: string) => void;
  size: NavButtonSize;
  shape: Shape;
  navVariant: Exclude<NavButtonVariant, 'plain'>;
};

export const SegmentPickerContext = createContext<SegmentPickerContextType | undefined>(undefined);
