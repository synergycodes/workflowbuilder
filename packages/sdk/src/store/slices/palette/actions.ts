import { useStore } from '../../store';

/** Loads node definitions into the store; Root calls it on mount, so layouts without a Palette still resolve them. */
export function loadNodeDefinitions() {
  useStore.getState().fetchData();
}
