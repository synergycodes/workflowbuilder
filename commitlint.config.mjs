// Enforces Conventional Commits on every commit in the monorepo.
// `.husky/commit-msg` calls `pnpm exec commitlint --edit "$1"` on each `git commit`.
// Format: <type>(<scope>): <subject> — e.g. `fix(sdk): zustand store identity leak in useStore`.
// Table of types and their semver bump impact: packages/sdk/RELEASE.md.

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
