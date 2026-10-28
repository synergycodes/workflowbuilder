import type { AuthVariables } from '../auth';
import type { TenantVariables } from '../tenant';

export type BackendEnv = { Variables: AuthVariables & TenantVariables };
