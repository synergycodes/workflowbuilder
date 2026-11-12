import { type Locator, type Page, expect } from '@playwright/test';

export function canvasNode(page: Page, nodeId: string): Locator {
  return page.locator(`.react-flow__node[data-id="${nodeId}"]`);
}

export function propertiesPanel(page: Page): Locator {
  return page.getByRole('region', { name: 'Properties' });
}

export function executionLog(page: Page): Locator {
  return page.getByRole('region', { name: 'Execution log' });
}

/** The run's status chip. It has no role or name of its own, so it is found as the element after the log's toggle. */
export function runStatus(page: Page): Locator {
  return executionLog(page).getByRole('button', { name: 'Execution log' }).locator('xpath=following-sibling::*[1]');
}

/** The log row in which a node reports a state, such as 'Completed' or /^Skipped/. */
export function logRow(page: Page, nodeId: string, state: string | RegExp): Locator {
  return executionLog(page)
    .locator(`[data-node-id="${nodeId}"]`)
    .filter({ has: page.getByText(state, { exact: true }) });
}

export async function pickTemplate(page: Page, name: string) {
  await page.getByRole('button', { name: 'Open palette' }).click();
  await page.getByRole('button', { name: 'Templates' }).click();
  const templates = page.getByRole('dialog', { name: 'Select a template' });
  await templates.getByText(name, { exact: true }).click();
  await expect(templates).toBeHidden();
}

export async function setTriggerInput(page: Page, nodeId: string, input: string) {
  await canvasNode(page, nodeId).click();
  const field = propertiesPanel(page).getByPlaceholder('Paste the input data here');
  await field.fill(input);
  // The field writes to the diagram when it loses focus, and Run reads the diagram at the click.
  await field.blur();
}

export function runButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Run', exact: true });
}

/** Clicks Run and returns the id of the run the backend started. */
export async function startRun(page: Page): Promise<string> {
  await runButton(page).click();
  await page.waitForURL(/[?&]executionId=/);
  return new URL(page.url()).searchParams.get('executionId')!;
}

/** Opens the decision a waiting node asks for and returns its form. */
export async function openDecision(page: Page, nodeLabel: string): Promise<Locator> {
  await page.getByRole('button', { name: `Decide: ${nodeLabel}` }).click();
  const form = propertiesPanel(page).getByRole('group', { name: 'Decision' });
  await expect(form).toBeVisible();
  return form;
}

/** A field of the decision form by its title. The title is not tied to the control, so the two are matched by their shared wrapper. */
export function decisionField(form: Locator, title: string): Locator {
  return form
    .locator('div:has(> span)')
    .filter({ has: form.page().getByText(title, { exact: true }) })
    .locator('input, textarea');
}

/** Clicks one of the decision's action buttons: 'Approve', 'Escalate…', 'Reject…'. */
export async function decide(page: Page, action: string) {
  await propertiesPanel(page).getByRole('button', { name: action, exact: true }).click();
}

/** The dialog an action with a required reason opens, titled with the action's label: 'Reject', 'Escalate'. */
export function reasonDialog(page: Page, actionLabel: string): Locator {
  return page.getByRole('dialog', { name: actionLabel, exact: true });
}
