import { expect, test } from '../src/fixtures';
import {
  decide,
  logRow,
  openDecision,
  pickTemplate,
  propertiesPanel,
  reasonDialog,
  runStatus,
  setTriggerInput,
  startRun,
} from '../src/studio';

test('a refund rejected with a reason completes the run as rejected and sends no confirmation', async ({
  studio: page,
  marker,
  llm,
  backend,
}) => {
  const reason = `The charge is not a duplicate. ${marker}`;
  await pickTemplate(page, 'Refund Review');
  await setTriggerInput(page, 'trigger-1', `Please refund my duplicate charge. ${marker}`);

  const executionId = await startRun(page);

  await expect(runStatus(page)).toHaveText('Waiting for decision');
  await expect(logRow(page, 'trigger-1', 'Completed')).toContainText(marker);

  const form = await openDecision(page, 'Review Refund');
  await decide(page, 'Reject…');
  const dialog = reasonDialog(page, 'Reject');
  const confirm = dialog.getByRole('button', { name: 'Confirm Rejection' });
  await expect(confirm).toBeDisabled();
  await expect(dialog.getByText('Rejection reason')).toBeVisible();
  await dialog.getByRole('textbox').fill(reason);
  await confirm.click();

  await expect(runStatus(page)).toHaveText('Completed');
  await expect(logRow(page, 'rejected-1', 'Completed')).toBeVisible();
  for (const nodeId of ['send-1', 'done-1', 'escalate-1', 'senior-1', 'rejected-2']) {
    await expect(logRow(page, nodeId, /^Skipped/)).toBeVisible();
  }
  await expect(form).toBeHidden();
  await expect(propertiesPanel(page).getByText(reason, { exact: true })).toBeVisible();

  const requests = await llm.requests();
  expect(requests.filter(({ system }) => system.includes('Send replyDraft to the customer'))).toEqual([]);

  await expect
    .poll(() => backend.execution(executionId))
    .toMatchObject({
      id: executionId,
      status: 'completed',
      outcome: 'rejected',
    });
});
