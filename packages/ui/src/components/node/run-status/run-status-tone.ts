/**
 * Every built-in node run tone, in display order.
 *
 * @category Node
 */
export const NODE_RUN_TONES = ['info', 'success', 'warning', 'critical', 'human', 'neutral', 'inverse'] as const;

/**
 * Colour role of a node run status part. Each part (`NodeRunRing`, `NodeRunIndicator`, `NodeRunBadge`) takes its own
 * tone, so one status can mix them, for example a success ring with a warning badge. Every part reads the palette of
 * its tone, `--wb-public-node-run-status-{stroke,halo,bg,fg}-<tone>`. Except `inverse`: `NodeRunBadge` reads the
 * Inverse pair of `BadgeLabel`, and `NodeRunIndicator` takes it only as `iconTone`.
 *
 * @category Node
 */
export type NodeRunTone = (typeof NODE_RUN_TONES)[number];

/**
 * A built-in `NodeRunTone` or the name of a custom one, which reads `--wb-public-node-run-status-<role>-<name>`. A
 * variable the application does not define, or a name outside `[a-z0-9-]`, falls back to the `neutral` one (the halo
 * to none).
 *
 * @category Node
 */
export type NodeRunToneName = NodeRunTone | (string & {});
