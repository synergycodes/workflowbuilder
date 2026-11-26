import { EdgePath } from '../../../diagram/edges/edge-path/edge-path';
import { withOptionalComponentPlugins } from '../../adapters/adapter-components';

/**
 * Plugin slot around the path of every built-in edge. Renders {@link EdgePath};
 * a `place: 'wrapper'` decorator on `'OptionalEdgePath'` reads its own run state
 * by `props.source` / `props.target` and returns
 * `<component {...props} runState={…} tone={…} lineType={…} />`, or `children`
 * to keep the edit look. `tone` replaces the run state's colour and needs
 * `runState`. Rendering `component` drops the wrappers inside it, so give
 * that decorator a high `priority`: the highest one wraps innermost. A custom
 * edge renders it to get the same states. Receives {@link EdgePathProps}.
 * Props that need no hooks go through `modifyProps`, see
 * [Setting props or wrapping a slot](/docs/guides/build-a-plugin/#setting-props-or-wrapping-a-slot).
 *
 * @category Components
 */
export const OptionalEdgePath = withOptionalComponentPlugins(EdgePath, 'OptionalEdgePath');
