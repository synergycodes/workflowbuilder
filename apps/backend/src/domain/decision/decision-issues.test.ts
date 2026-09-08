import { describe, expect, it } from 'vitest';

import { DECISION_ISSUE_MESSAGES, decisionIssue, decisionIssueMessage } from './decision-issues';

describe('decisionIssueMessage', () => {
  it('fills the placeholder', () => {
    expect(decisionIssueMessage('duplicate_action_name', 'approve')).toBe(
      "action name 'approve' is used more than once",
    );
  });

  it('keeps replacement patterns in the value verbatim', () => {
    expect(decisionIssueMessage('source_has_decision_request', '$&-$1')).toBe(
      "proposal source '$&-$1' carries its own decision request and cannot be re-run",
    );
  });

  it('ignores a value for a message without a placeholder', () => {
    expect(decisionIssueMessage('resume_required', 'ignored')).toBe(DECISION_ISSUE_MESSAGES.resume_required);
  });

  it('builds the issue shape a superRefine adds', () => {
    expect(decisionIssue('port_empty', ['actions', 0, 'port'])).toEqual({
      code: 'custom',
      message: 'port must not be empty',
      path: ['actions', 0, 'port'],
    });
  });
});
