export const GITHUB_REPO_BASE =
  import.meta.env['GITHUB_REPO_BASE'] ??
  'https://github.com/synergycodes/workflowbuilder/blob/main/apps/demo/src/app/data/nodes';

/**
 * The runnable starter on GitHub, as `owner/repo/tree/<ref>/<path>`.
 *
 * Change the ref here and both the embed and every docs link follow. The three
 * READMEs repeat it, because Markdown cannot import a constant.
 */
export const STARTER_PROJECT =
  'synergycodes/workflowbuilder/tree/feat/MARK-3156-stackblitz-starter-example/examples/workflow-builder-starter';

/** File the StackBlitz editor opens. */
export const STARTER_FILE = 'src/app.tsx';

/** Project name. Always send one, or StackBlitz glues owner onto repo name. */
export const STARTER_TITLE = 'Workflow Builder Starter Example';

/**
 * Opens an editable copy. Plain `/github/` gives no write access, so the first
 * save reloads the page.
 */
export const STARTER_FORK_URL = `https://stackblitz.com/fork/github/${STARTER_PROJECT}?${new URLSearchParams({
  title: STARTER_TITLE,
  file: STARTER_FILE,
})}`;
