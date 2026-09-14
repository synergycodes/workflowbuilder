import type { PaletteItemOrGroup } from '@workflowbuilder/sdk';

import { action } from './action/action';
import { decision } from './decision/decision';
import { trigger } from './trigger/trigger';

// Passed to <WorkflowBuilder.Root nodeTypes={...} />. Must stay a stable
// module-level reference - see the SDK docs on the `nodeTypes` prop.
export const nodeTypes: PaletteItemOrGroup[] = [trigger, action, decision];
