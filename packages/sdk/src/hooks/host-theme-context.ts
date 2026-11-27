import { createContext } from 'react';

import type { Theme } from './theme';

// The Root's `theme` prop, readable on the first render: the controlled store only gets it in Root's
// layout effect, which runs after every child has rendered and run its effects. `null` when uncontrolled.
export const HostThemeContext = createContext<Theme | null>(null);
