import { expect, test } from '../src/fixtures';
import { logRow, pickTemplate, runButton, runStatus, setTriggerInput, startRun } from '../src/studio';

test('Stop cancels a running run before it reaches the decision, and Reset gives the canvas back', async ({
  studio: page,
  marker,
  backend,
}) => {
  await pickTemplate(page, 'Refund Review');
  await setTriggerInput(page, 'trigger-1', `Please refund my duplicate charge. ${marker} e2e:delay=30000`);

  const executionId = await startRun(page);
  await expect(runStatus(page)).toHaveText('Running');
  await expect(logRow(page, 'draft-1', 'Started')).toBeVisible();

  await page.getByRole('button', { name: 'Stop', exact: true }).click();

  await expect(runStatus(page)).toHaveText('Cancelled');
  await expect(logRow(page, 'review-1', 'Waiting for decision')).toHaveCount(0);
  await expect.poll(() => backend.execution(executionId)).toMatchObject({ id: executionId, status: 'cancelled' });

  await page.getByRole('button', { name: 'Reset', exact: true }).click();

  await expect(runButton(page)).toBeVisible();
  expect(new URL(page.url()).searchParams.has('executionId')).toBe(false);
});
