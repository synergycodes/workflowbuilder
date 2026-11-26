import { expect, test } from '../src/fixtures';
import {
  executionLog,
  logRow,
  pickTemplate,
  runButton,
  runStatus,
  setTriggerInput,
  startRun,
  waitingNotice,
} from '../src/studio';

test('Stop cancels a running run before it reaches the decision, and Reset gives the canvas back', async ({
  studio: page,
  marker,
  llm,
  backend,
}) => {
  await pickTemplate(page, 'Refund Review');
  await setTriggerInput(page, 'trigger-1', `Please refund my duplicate charge. ${marker} e2e:delay=30000`);

  const executionId = await startRun(page);
  await expect(runStatus(page)).toHaveText('Running');
  await expect(logRow(page, 'draft-1', 'Started')).toBeVisible();
  // Without the held model call the draft finishes at once and Stop only wins by luck.
  await expect.poll(() => llm.requests()).toHaveLength(1);

  await page.getByRole('button', { name: 'Stop', exact: true }).click();

  await expect(runStatus(page)).toHaveText('Cancelled');
  await expect(logRow(page, 'review-1', 'Waiting for decision')).toHaveCount(0);
  await expect.poll(() => backend.execution(executionId)).toMatchObject({ id: executionId, status: 'cancelled' });

  await page.getByRole('button', { name: 'Reset', exact: true }).click();

  await expect(runButton(page)).toBeVisible();
  await expect(executionLog(page)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('executionId')).toBe(false);
});

test('Stop cancels a run that is waiting for a decision', async ({ studio: page, backend }) => {
  await pickTemplate(page, 'Refund Review');

  const executionId = await startRun(page);
  await expect(runStatus(page)).toHaveText('Waiting for decision');
  await expect(waitingNotice(page, 'Review Refund')).toBeVisible();

  await page.getByRole('button', { name: 'Stop', exact: true }).click();

  await expect(runStatus(page)).toHaveText('Cancelled');
  await expect(waitingNotice(page, 'Review Refund')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Decide: Review Refund' })).toHaveCount(0);
  await expect.poll(() => backend.execution(executionId)).toMatchObject({ id: executionId, status: 'cancelled' });
});
