import { createRunWorkflow } from '../../src/workflow/index';
import { heartbeatProfiles } from './heartbeat-profiles';

export const runWorkflow = createRunWorkflow({ nodeActivityProfiles: heartbeatProfiles });
