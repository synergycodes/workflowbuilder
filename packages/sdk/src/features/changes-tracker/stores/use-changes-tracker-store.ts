import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { withOptionalFunctionPlugins } from '../../plugins-core/adapters/adapter-functions';

const initTimestamp = Date.now();

type ChangesTrackerStore = {
  lastChangeName: string;
  lastChangeParams: object;
  lastChangeTimestamp: number;
};

const emptyStore: ChangesTrackerStore = {
  lastChangeName: '',
  lastChangeParams: {},
  lastChangeTimestamp: initTimestamp,
};

/**
 * Zustand store that emits a tick every time a tracked diagram change is
 * about to happen. Subscribe with `useChangesTrackerStore((s) => s.lastChangeName)`
 * (or other fields) to react to changes — useful for undo/redo plugins,
 * autosave, audit logging, and so on.
 *
 * State shape: `{ lastChangeName, lastChangeParams, lastChangeTimestamp }`
 * — the timestamp is the cheapest field to subscribe to when you only
 * care about "something changed".
 *
 * @category Store
 */
export const useChangesTrackerStore = create<ChangesTrackerStore>()(
  devtools(
    () =>
      ({
        ...emptyStore,
      }) satisfies ChangesTrackerStore,
    { name: 'changesTrackerStore' },
  ),
);

function trackFutureChangeFunction(changeName: string, params?: object) {
  useChangesTrackerStore.setState({
    lastChangeName: changeName,
    lastChangeParams: params || {},
    lastChangeTimestamp: Date.now(),
  });
}

/**
 * Mark that a tracked change is about to occur. Updates the
 * {@link useChangesTrackerStore} so subscribers see the new
 * `lastChangeName` / `lastChangeTimestamp`.
 *
 * Wrapped with `withOptionalFunctionPlugins`, so plugins can decorate it
 * via {@link registerFunctionDecorator} keyed `'trackFutureChange'` to
 * observe or transform every change before it reaches the store.
 *
 * @param changeName - Identifier of the impending change (e.g.
 *   `'addEdge'`, `'nodeDragStart'`, `'delete'`).
 * @param params - Optional metadata about the change.
 *
 * @category Store
 */
export const trackFutureChange = withOptionalFunctionPlugins(trackFutureChangeFunction, 'trackFutureChange');
