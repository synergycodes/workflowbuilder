import { expect, test } from '../src/fixtures';
import { executionLog, logRow, pickTemplate, runStatus, setTriggerInput, startRun } from '../src/studio';

test('a run started after Reset takes the edited input and shows only its own log', async ({
  studio: page,
  marker,
  llm,
  backend,
}) => {
  const firstInput = `Please refund my duplicate charge. ${marker} first`;
  const secondInput = `Please refund my unused month. ${marker} second`;
  await pickTemplate(page, 'Refund Review');
  await setTriggerInput(page, 'trigger-1', firstInput);

  const firstExecutionId = await startRun(page);
  await expect(runStatus(page)).toHaveText('Waiting for decision');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(runStatus(page)).toHaveText('Cancelled');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(executionLog(page)).toHaveCount(0);

  await setTriggerInput(page, 'trigger-1', secondInput);
  const secondExecutionId = await startRun(page);

  expect(secondExecutionId).not.toBe(firstExecutionId);
  await expect(runStatus(page)).toHaveText('Waiting for decision');
  await expect(logRow(page, 'trigger-1', 'Completed')).toContainText(secondInput);
  await expect(executionLog(page)).not.toContainText(firstInput);

  const requests = await llm.requests();
  const drafts = requests.filter(({ system }) => system.includes('Decide the refund amount under the policy'));
  expect(drafts).toHaveLength(2);
  expect(drafts[1]?.user).toContain(secondInput);
  expect(drafts[1]?.user).not.toContain(firstInput);

  await expect
    .poll(() => backend.execution(secondExecutionId))
    .toMatchObject({ id: secondExecutionId, status: 'waiting' });
  await expect
    .poll(() => backend.execution(firstExecutionId))
    .toMatchObject({ id: firstExecutionId, status: 'cancelled' });
});
