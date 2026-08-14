import { Shape } from '@ui/components/button/types';
import { Size } from '@ui/shared/types/size';
import { MouseEvent, createContext } from 'react';

type SegmentPickerContextType = {
  selectedValue: string | undefined;
  onSelect: (event: MouseEvent<HTMLButtonElement>, value: string) => void;
  size?: Size;
  shape?: Shape;
};

export const SegmentPickerContext = createContext<SegmentPickerContextType | undefined>(undefined);
