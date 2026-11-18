import { expect, test } from '../src/fixtures';
import {
  decide,
  logRow,
  openDecision,
  openDecisionFromNotice,
  pickTemplate,
  reasonDialog,
  runStatus,
  setTriggerInput,
  startRun,
  waitingNotice,
} from '../src/studio';

test('an escalated refund waits for the senior reviewer, whose approval sends the confirmation', async ({
  studio: page,
  marker,
  llm,
  backend,
}) => {
  const reason = `The amount is above my limit. ${marker}`;
  await pickTemplate(page, 'Refund Review');
  await setTriggerInput(page, 'trigger-1', `Please refund my duplicate charge. ${marker}`);

  const executionId = await startRun(page);
  await expect(runStatus(page)).toHaveText('Waiting for decision');

  await openDecision(page, 'Review Refund');
  await decide(page, 'Escalate…');
  const dialog = reasonDialog(page, 'Escalate');
  const confirm = dialog.getByRole('button', { name: 'Confirm Escalate' });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox').fill(reason);
  await confirm.click();

  await expect(logRow(page, 'escalate-1', 'Completed')).toBeVisible();
  await expect(logRow(page, 'senior-1', 'Waiting for decision')).toBeVisible();
  await expect(logRow(page, 'rejected-1', /^Skipped/)).toBeVisible();
  await expect(waitingNotice(page, 'Senior Review')).toBeVisible();
  await expect(runStatus(page)).toHaveText('Waiting for decision');
  await expect(logRow(page, 'send-1', 'Completed')).toHaveCount(0);
  await expect.poll(() => backend.execution(executionId)).toMatchObject({ id: executionId, status: 'waiting' });

  await openDecisionFromNotice(page, 'Senior Review');
  await decide(page, 'Approve');

  await expect(runStatus(page)).toHaveText('Completed');
  await expect(logRow(page, 'send-1', 'Completed')).toBeVisible();
  await expect(logRow(page, 'done-1', 'Completed')).toBeVisible();
  await expect(logRow(page, 'rejected-2', /^Skipped/)).toBeVisible();

  const requests = await llm.requests();
  const brief = requests.find(({ system }) => system.includes('A first reviewer escalated the refund'));
  expect(brief?.user).toContain(reason);
  expect(requests.filter(({ system }) => system.includes('Send replyDraft to the customer'))).toHaveLength(1);

  await expect
    .poll(() => backend.execution(executionId))
    .toMatchObject({ id: executionId, status: 'completed', outcome: null });
});
