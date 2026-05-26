import type { NodePanel } from '@synergycodes/overflow-ui';
import type { ComponentProps } from 'react';

import type { LayoutDirection } from '../../../node/common';

// Source-of-truth: overflow-ui's `<NodePanel.Handles>` prop, so adding a new
// alignment in overflow-ui surfaces here as a type error instead of silently
// drifting.
type HandlesAlignment = NonNullable<ComponentProps<typeof NodePanel.Handles>['alignment']>;

// Unifies how built-in node templates choose the `alignment` prop they pass to
// `<NodePanel.Handles>`, so the formula has one place to evolve instead of
// being re-derived per template.
//
// This helper alone does NOT make ports align across nodes. The visual
// stability of the resulting port Y depends on a companion global CSS rule in
// `packages/sdk/src/index.css` (search WB-192): the formula picks 'header' for
// horizontal flow, then the CSS pin anchors the port to the NodeIcon's
// vertical center so multi-line descriptions don't shift it. Both layers must
// stay in sync; removing either reintroduces the bug.
export function getHandlesAlignment({ layoutDirection }: { layoutDirection: LayoutDirection }): HandlesAlignment {
  return layoutDirection === 'RIGHT' ? 'header' : 'center';
}
