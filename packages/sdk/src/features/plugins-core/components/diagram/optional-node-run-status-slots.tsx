import type { PropsWithChildren } from 'react';

import { withOptionalComponentPlugins } from '../../adapters/adapter-components';

type Props = {
  nodeId: string;
};

function OptionalWrapper({ children }: PropsWithChildren<Props>) {
  return children;
}

/**
 * Plugin slot inside the node's `NodePanel.Overlay`, a layer over the whole
 * canvas node. Empty by default; decorate `'OptionalNodeOverlay'` with
 * {@link registerComponentDecorator} to draw run status layers such as
 * `NodeRunRing`, `NodeRunVeil` or `NodeRunProgress`. Receives `nodeId`.
 *
 * @category Components
 */
export const OptionalNodeOverlay = withOptionalComponentPlugins(OptionalWrapper, 'OptionalNodeOverlay');

/**
 * Plugin slot on the node's top-right corner. Renders the validation `Status`
 * by default; a `place: 'wrapper'` decorator on `'OptionalNodeCorner'` can
 * return its own element (e.g. `NodeRunBadge`) instead of `children` to
 * replace it. Receives `nodeId`.
 *
 * @category Components
 */
export const OptionalNodeCorner = withOptionalComponentPlugins(OptionalWrapper, 'OptionalNodeCorner');

/**
 * Plugin slot at the end of the canvas node's header, after the collapse
 * button. Empty by default; decorate `'OptionalNodeHeaderEnd'` to add e.g. a
 * `NodeRunIndicator`. A long title truncates before it. Receives `nodeId`.
 *
 * @category Components
 */
export const OptionalNodeHeaderEnd = withOptionalComponentPlugins(OptionalWrapper, 'OptionalNodeHeaderEnd');
