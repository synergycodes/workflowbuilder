import { EdgePath } from '../../../diagram/edges/edge-path/edge-path';
import { withOptionalComponentPlugins } from '../../adapters/adapter-components';

/**
 * Plugin slot around the path of every built-in edge. Renders {@link EdgePath};
 * a `place: 'wrapper'` decorator on `'OptionalEdgePath'` reads its own run state
 * by `props.source` / `props.target` and returns
 * `<component {...props} runState={…} lineType={…} />`, or `children` to keep
 * the edit look. A custom edge renders it to get the same states. Receives
 * {@link EdgePathProps}.
 *
 * @category Components
 */
export const OptionalEdgePath = withOptionalComponentPlugins(EdgePath, 'OptionalEdgePath');
