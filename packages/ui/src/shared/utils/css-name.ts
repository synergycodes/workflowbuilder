const CSS_NAME_PART = /^[a-z0-9-]+$/;

/**
 * Whether a name is safe to splice into a CSS custom property name, such as a tone in
 * `--wb-public-node-run-status-bg-<tone>`. Anything else would break the whole `var()`, so callers treat it as unset.
 */
export function isCssNamePart(name: string | undefined): name is string {
  return name !== undefined && CSS_NAME_PART.test(name);
}
