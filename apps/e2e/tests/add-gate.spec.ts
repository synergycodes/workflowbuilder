import { expect, test } from '../src/fixtures';
import {
  addNodeFromPalette,
  canvasNode,
  connectNodes,
  decide,
  executionLog,
  logRow,
  openDecisionFromNotice,
  pickTemplate,
  propertiesPanel,
  removeConnection,
  runStatus,
  setNodeTitle,
  setTriggerInput,
  spotAbove,
  startRun,
  waitingNotice,
} from '../src/studio';

test('a gate drawn in front of the AI step stops the next run there, before any model call', async ({
  studio: page,
  marker,
  llm,
  backend,
}) => {
  const gateTitle = 'Check the Request First';
  await pickTemplate(page, 'Refund Review');
  const trigger = canvasNode(page, 'trigger-1');
  const draft = canvasNode(page, 'draft-1');

  const gate = await addNodeFromPalette(page, 'Human decision', await spotAbove(draft));
  await removeConnection(page, trigger, draft);
  await connectNodes(page, trigger, gate);
  await connectNodes(page, gate, draft, 'source:inner:approved');
  await setNodeTitle(page, gate, gateTitle);
  const gateId = (await gate.getAttribute('data-id'))!;
  await setTriggerInput(page, 'trigger-1', `Please refund my duplicate charge. ${marker}`);

  const executionId = await startRun(page);

  await expect(logRow(page, gateId, 'Waiting for decision')).toBeVisible();
  await expect(runStatus(page)).toHaveText('Waiting for decision');
  await expect(logRow(page, 'trigger-1', 'Completed')).toContainText(marker);
  await expect(waitingNotice(page, gateTitle)).toBeVisible();
  await expect(executionLog(page).locator('[data-node-id="draft-1"]')).toHaveCount(0);
  expect(await llm.requests()).toEqual([]);
  await expect.poll(() => backend.execution(executionId)).toMatchObject({ id: executionId, status: 'waiting' });

  const form = await openDecisionFromNotice(page, gateTitle);
  await expect(form.locator('input, textarea')).toHaveCount(0);
  await expect(propertiesPanel(page).getByRole('button', { name: 'Reject…', exact: true })).toBeVisible();
  await expect(propertiesPanel(page).getByRole('button', { name: 'Escalate…', exact: true })).toHaveCount(0);
  await decide(page, 'Approve');

  await expect(logRow(page, gateId, 'Completed')).toBeVisible();
  await expect(logRow(page, 'draft-1', 'Completed')).toBeVisible();
  await expect(logRow(page, 'review-1', 'Waiting for decision')).toBeVisible();
  await expect(waitingNotice(page, 'Review Refund')).toBeVisible();

  const requests = await llm.requests();
  expect(requests.filter(({ system }) => system.includes('Decide the refund amount under the policy'))).toHaveLength(1);
});
