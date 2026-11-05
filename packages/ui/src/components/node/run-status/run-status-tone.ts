/**
 * Colour role of a node run status part. Each part (`NodeRunRing`, `NodeRunIndicator`, `NodeRunBadge`) takes its own
 * tone, so one status can mix them, for example a success ring with a warning badge.
 *
 * @category Node
 */
export type RunStatusTone = 'info' | 'success' | 'warning' | 'critical' | 'human' | 'neutral' | 'inverse';
