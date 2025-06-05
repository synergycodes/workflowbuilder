import { SetDiagramState, GetDiagramState, WorkflowEditorState } from '@/store/store';

/**
 * @param state - current state of the store, this property should not be modified.
 * @param change - the action that was sent to the store. This can be modified and also could have been modified by a previous middleware.
 * @param next - function to call the next middleware. If this function is not called, the store update is aborted.
 * If the middleware doesn't perform any modifications but still wants the action to proceed it should call this function with the unmodified `change`.
 */
type DiagramStateMiddleware = (
  state: WorkflowEditorState,
  change: Partial<WorkflowEditorState>,
  next: (change: Partial<WorkflowEditorState>) => void,
) => void;

/**
 * Middleware implementation for Zustand.
 * @param sliceCreator - Function normally passed as an argument to Zustands' `computed`
 * @param middlewareArray - An array of `DiagramStateMiddleware`. Each middleware is called in the order it was placed in the array,
 * beginning from the start of the array.
 *
 * Every middleware can mutate the `change`, passing the mutated change to the next middleware.
 * After every middleware called `next`, the change (action) is assigned to the store, together with any modifications made to this change.
 *
 * For the change to be registered every middleware must call `next`. If any middleware doesn't call `next` the action
 * is canceled and the store isn't updated (hence "intercepting"). This behavior is based on redux-style middleware.
 */
export function withInterceptingMiddleware(
  sliceCreator: (set: SetDiagramState, get: GetDiagramState) => WorkflowEditorState,
) {
  return (middlewareArray: DiagramStateMiddleware[]) => (set: SetDiagramState, get: GetDiagramState) => {
    function interceptedSet(partial: Parameters<SetDiagramState>[0], replace: Parameters<SetDiagramState>[1]) {
      const state = get();
      /* A `set()` can be either an object or an update function, e.g:
       * set({ property: 0 })
       * set((state) => ({ property: state.property + 1})) */
      let change = typeof partial === 'function' ? partial(state) : partial;
      let finalize = true;

      let nextChange: Partial<WorkflowEditorState> | null = null;
      function next(change: Partial<WorkflowEditorState>) {
        return (nextChange = change);
      }

      for (const middleware of middlewareArray) {
        middleware(state, change, next);
        if (!nextChange) {
          finalize = false;
          break;
        }
        change = nextChange;
      }

      if (finalize) {
        set(change, replace);
      }
    }
    return sliceCreator(interceptedSet, get);
  };
}
