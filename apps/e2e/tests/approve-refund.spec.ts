import { FAKE_TEXT_REPLY } from '../src/fake-llm/server';
import { FAKE_NUMBER } from '../src/fake-llm/value-from-schema';
import { expect, test } from '../src/fixtures';
import {
  canvasNode,
  decide,
  decisionField,
  logRow,
  openDecision,
  pickTemplate,
  runStatus,
  setTriggerInput,
  startRun,
} from '../src/studio';

test('a refund approved with a corrected amount completes the run and sends that amount on', async ({
  studio: page,
  marker,
  llm,
  backend,
}) => {
  const correctedAmount = FAKE_NUMBER + 23.5;
  await pickTemplate(page, 'Refund Review');
  await setTriggerInput(page, 'trigger-1', `Please refund my duplicate charge. ${marker}`);

  const executionId = await startRun(page);

  await expect(runStatus(page)).toHaveText('Waiting for decision');
  await expect(logRow(page, 'trigger-1', 'Completed')).toContainText(marker);
  await expect(logRow(page, 'draft-1', 'Completed')).toBeVisible();
  await expect(logRow(page, 'review-1', 'Waiting for decision')).toBeVisible();

  const form = await openDecision(page, 'Review Refund');
  await expect(decisionField(form, 'Refund amount')).toHaveValue(String(FAKE_NUMBER));
  await decisionField(form, 'Refund amount').fill(String(correctedAmount));
  await decide(page, 'Approve');

  await expect(runStatus(page)).toHaveText('Completed');
  await expect(logRow(page, 'send-1', 'Completed')).toBeVisible();
  await expect(logRow(page, 'done-1', 'Completed')).toBeVisible();
  for (const nodeId of ['escalate-1', 'senior-1', 'rejected-1', 'rejected-2']) {
    await expect(logRow(page, nodeId, /^Skipped/)).toBeVisible();
  }
  await expect(canvasNode(page, 'done-1')).toContainText(FAKE_TEXT_REPLY);

  const requests = await llm.requests();
  const confirmation = requests.find(({ system }) => system.includes('Send replyDraft to the customer'));
  expect(confirmation?.user).toContain(`"refundAmount":${correctedAmount}`);

  await expect.poll(() => backend.execution(executionId)).toMatchObject({ id: executionId, status: 'completed' });
});
