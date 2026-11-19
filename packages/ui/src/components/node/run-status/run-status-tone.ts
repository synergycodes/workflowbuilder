/**
 * Every run status tone, in display order.
 *
 * @category Node
 */
export const RUN_STATUS_TONES = ['info', 'success', 'warning', 'critical', 'human', 'neutral', 'inverse'] as const;

/**
 * Colour role of a node run status part. Each part (`NodeRunRing`, `NodeRunIndicator`, `NodeRunBadge`) takes its own
 * tone, so one status can mix them, for example a success ring with a warning badge. Every part reads the palette of
 * its tone, `--wb-public-node-run-status-{stroke,halo,bg,fg}-<tone>`. Except `inverse`: `NodeRunBadge` reads the
 * Inverse pair of `BadgeLabel`, and `NodeRunIndicator` takes it only as `iconTone`.
 *
 * @category Node
 */
export type RunStatusTone = (typeof RUN_STATUS_TONES)[number];
