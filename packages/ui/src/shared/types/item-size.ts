import type { Size } from './size';

export type ItemSize = Extract<Size, 'large' | 'medium' | 'small'>;
