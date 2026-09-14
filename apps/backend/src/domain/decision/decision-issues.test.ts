import { describe, expect, it } from 'vitest';

import {
  DECISION_ISSUE_MESSAGES,
  decisionIssue,
  decisionIssueMessage,
  decisionIssueOf,
  decisionRefinement,
} from './decision-issues';

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

  it('builds the issue shape a superRefine adds, carrying its identifier', () => {
    expect(decisionIssue('duplicate_action_name', ['actions', 1, 'name'], 'approve')).toEqual({
      code: 'custom',
      message: "action name 'approve' is used more than once",
      path: ['actions', 1, 'name'],
      params: { issue: 'duplicate_action_name', value: 'approve' },
    });
  });

  it('leaves `value` out of the identifier when the message has none', () => {
    expect(decisionIssue('port_empty', ['actions', 0, 'port']).params).toEqual({ issue: 'port_empty' });
    expect(decisionRefinement('port_empty')).toEqual({
      error: 'port must not be blank',
      params: { issue: 'port_empty' },
    });
  });
});

describe('decisionIssueOf', () => {
  it('reads the identifier back off an issue, with and without a value', () => {
    expect(decisionIssueOf(decisionIssue('duplicate_effect', ['actions'], 'resume'))).toEqual({
      issue: 'duplicate_effect',
      value: 'resume',
    });
    expect(decisionIssueOf(decisionIssue('resume_required', ['actions']))).toEqual({ issue: 'resume_required' });
  });

  it.each([
    { name: "zod's own structural issue", issue: { code: 'invalid_type', path: ['nodes'], message: 'x' } },
    { name: 'params that are not ours', issue: { code: 'custom', params: { minimum: 1 } } },
    { name: 'an identifier not in the dictionary', issue: { code: 'custom', params: { issue: 'made_up' } } },
    {
      name: 'an identifier that exists only on Object.prototype',
      issue: { code: 'custom', params: { issue: 'constructor' } },
    },
    { name: 'no object at all', issue: null },
  ])('answers undefined for $name', ({ issue }) => {
    expect(decisionIssueOf(issue)).toBeUndefined();
  });
});
