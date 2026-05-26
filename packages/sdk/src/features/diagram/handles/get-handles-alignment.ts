import type { LayoutDirection } from '../../../node/common';

export type HandlesAlignment = 'header' | 'center';

// Where the handles sit vertically on a node. For horizontal flow ('RIGHT')
// every built-in template aligns handles to the header section so edges
// connect at the same Y regardless of how tall the node grows; for vertical
// flow ('DOWN') we center them on the node body. Keep all node templates
// routed through this helper so new node types inherit aligned handles
// instead of re-deriving the rule and drifting (see WB-192).
export function getHandlesAlignment({ layoutDirection }: { layoutDirection: LayoutDirection }): HandlesAlignment {
  return layoutDirection === 'RIGHT' ? 'header' : 'center';
}
