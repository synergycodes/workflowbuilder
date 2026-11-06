import { Status } from '@workflowbuilder/ui';

import { withOptionalComponentPlugins } from '../../adapters/adapter-components';
import { OptionalWrapper } from './optional-node-content';

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

// Not a wrapper around `NodePanel.Overlay`: `NodePanel.Root` finds the Overlay by its direct child type.
export function NodeOverlaySlots({ nodeId, isValid }: { nodeId: string; isValid?: boolean }) {
  return (
    <>
      <OptionalNodeOverlay nodeId={nodeId} />
      <OptionalNodeCorner nodeId={nodeId}>
        <Status status={isValid === false ? 'invalid' : undefined} />
      </OptionalNodeCorner>
    </>
  );
}
