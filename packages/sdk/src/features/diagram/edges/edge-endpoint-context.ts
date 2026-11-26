import type { EdgeEndpoint } from '@workflowbuilder/ui';
import { createContext } from 'react';

/** `edgeEndpoint` of the enclosing `<WorkflowBuilder.Root>`. */
export const EdgeEndpointContext = createContext<EdgeEndpoint>('none');
