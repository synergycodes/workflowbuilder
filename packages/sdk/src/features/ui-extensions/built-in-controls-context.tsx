import { createContext, useContext } from 'react';

import type { BuiltInControl, BuiltInControls } from './built-in-controls';

export const EMPTY_CONTROLS: BuiltInControls = Object.freeze({});

const BuiltInControlsContext = createContext<BuiltInControls>(EMPTY_CONTROLS);

export const BuiltInControlsProvider = BuiltInControlsContext.Provider;

export function useIsBuiltInControlVisible(key: BuiltInControl): boolean {
  return useContext(BuiltInControlsContext)[key] ?? true;
}
