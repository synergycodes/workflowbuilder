import { FAKE_TEXT_REPLY } from '../src/fake-llm/server';
import { expect, test } from '../src/fixtures';
import {
  canvasNode,
  decide,
  logRow,
  openDecision,
  pickTemplate,
  runButton,
  runStatus,
  setTriggerInput,
  startRun,
} from '../src/studio';

test('a run waiting for a decision survives a page reload and completes once approved', async ({
  studio: page,
  marker,
  llm,
  backend,
}) => {
  await pickTemplate(page, 'Refund Review');
  await setTriggerInput(page, 'trigger-1', `Please refund my duplicate charge. ${marker}`);

  const executionId = await startRun(page);
  await expect(runStatus(page)).toHaveText('Waiting for decision');

  await page.reload();

  expect(new URL(page.url()).searchParams.get('executionId')).toBe(executionId);
  await expect(runStatus(page)).toHaveText('Waiting for decision');
  await expect(logRow(page, 'trigger-1', 'Completed')).toContainText(marker);
  await expect(logRow(page, 'draft-1', 'Completed')).toBeVisible();
  await expect(logRow(page, 'review-1', 'Waiting for decision')).toBeVisible();
  await expect(page.getByText(`Run ${executionId.slice(0, 8)}`, { exact: true })).toBeVisible();
  await expect(runButton(page)).toBeHidden();

  await openDecision(page, 'Review Refund');
  await decide(page, 'Approve');

  await expect(runStatus(page)).toHaveText('Completed');
  await expect(logRow(page, 'done-1', 'Completed')).toBeVisible();
  await expect(canvasNode(page, 'done-1')).toContainText(FAKE_TEXT_REPLY);

  const requests = await llm.requests();
  expect(requests.filter(({ system }) => system.includes('Decide the refund amount under the policy'))).toHaveLength(1);

  await expect.poll(() => backend.execution(executionId)).toMatchObject({ id: executionId, status: 'completed' });
});
