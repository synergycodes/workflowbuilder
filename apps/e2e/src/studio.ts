import { type Locator, type Page, expect } from '@playwright/test';

type Point = { x: number; y: number };

export function canvasNode(page: Page, nodeId: string): Locator {
  return page.locator(`.react-flow__node[data-id="${nodeId}"]`);
}

/** A point on the empty canvas over a node, a few of the node's heights up, once the canvas has stopped moving. */
export async function spotAbove(node: Locator): Promise<Point> {
  const handle = await node.elementHandle();
  // Picking a template animates the view into place.
  await handle?.waitForElementState('stable');
  const box = await node.boundingBox();
  if (!box) throw new Error('The node is not on the canvas.');
  return { x: box.x, y: box.y - box.height * 4 };
}

async function canvasNodeIds(page: Page): Promise<string[]> {
  const ids = await page.locator('.react-flow__node').evaluateAll((nodes) => nodes.map((node) => node.dataset['id']));
  return ids.filter((id) => id !== undefined);
}

/**
 * Drags an item of the open palette to a point of the page that shows empty canvas and returns the node it became.
 * The node's id is generated, so it is found as the one that was not there before.
 */
export async function addNodeFromPalette(page: Page, itemName: string, at: Point): Promise<Locator> {
  const before = await canvasNodeIds(page);
  const item = page.locator('[draggable="true"]').filter({ has: page.getByText(itemName, { exact: true }) });
  const pane = page.locator('.react-flow__pane');
  const paneBox = await pane.boundingBox();
  if (!paneBox) throw new Error('The canvas is not visible.');
  await item.dragTo(pane, { targetPosition: { x: at.x - paneBox.x, y: at.y - paneBox.y } });

  let added: string[] = [];
  await expect
    .poll(async () => {
      const now = await canvasNodeIds(page);
      added = now.filter((id) => !before.includes(id));
      return added;
    })
    .toHaveLength(1);
  return canvasNode(page, added[0]!);
}

async function nodeId(node: Locator): Promise<string> {
  const id = await node.getAttribute('data-id');
  if (!id) throw new Error('Not a canvas node.');
  return id;
}

/** The edge between two nodes. React Flow names it by their ids. */
export async function connection(page: Page, from: Locator, to: Locator): Promise<Locator> {
  return page.getByRole('group', { name: `Edge from ${await nodeId(from)} to ${await nodeId(to)}`, exact: true });
}

/** Draws an edge from a port of one node to the input of another. An ordinary node has one output port, 'source'. */
export async function connectNodes(page: Page, from: Locator, to: Locator, port = 'source') {
  const output = from.locator(`.react-flow__handle[data-handleid="${port}"]`);
  await output.dragTo(to.locator('.react-flow__handle[data-handleid="target"]'));
  await expect(await connection(page, from, to)).toHaveCount(1);
}

/** Selects the edge between two nodes with a click on its middle, deletes it with the keyboard and confirms. */
export async function removeConnection(page: Page, from: Locator, to: Locator) {
  const edge = await connection(page, from, to);
  const line = edge.locator('path[data-edge-id]');
  const handle = await line.elementHandle();
  await handle?.waitForElementState('stable');
  const middle = await line.evaluate((path: SVGPathElement) => {
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const matrix = path.getScreenCTM();
    if (!matrix) throw new Error('The edge is not rendered.');
    return {
      x: point.x * matrix.a + point.y * matrix.c + matrix.e,
      y: point.x * matrix.b + point.y * matrix.d + matrix.f,
    };
  });
  await page.mouse.click(middle.x, middle.y);
  // Another edge drawn over the same point would take the click instead.
  await expect(edge).toHaveClass(/selected/);

  await page.keyboard.press('Delete');
  await page.getByRole('dialog', { name: 'Delete Selection?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(edge).toHaveCount(0);
}

export async function setNodeTitle(page: Page, node: Locator, title: string) {
  await node.click();
  const field = propertiesPanel(page).getByPlaceholder('Node Title...');
  await field.fill(title);
  await field.blur();
  await expect(node).toContainText(title);
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

/** The notice shown while a run waits for a person's decision on the node with this label. */
export function waitingNotice(page: Page, nodeLabel: string): Locator {
  return page
    .getByRole('status')
    .filter({ has: page.getByText('Waiting for decision', { exact: true }) })
    .filter({ has: page.getByText(nodeLabel, { exact: true }) });
}

/** Opens the decision a waiting node asks for and returns its form. */
export async function openDecision(page: Page, nodeLabel: string): Promise<Locator> {
  await page.getByRole('button', { name: `Decide: ${nodeLabel}` }).click();
  const form = propertiesPanel(page).getByRole('group', { name: 'Decision' });
  await expect(form).toBeVisible();
  return form;
}

/**
 * Opens the waiting decision from the notice and returns its form. Unlike the node's own button, the notice cannot
 * end up under an edge. The form of a gate without fields is empty, so it is attached but not visible.
 */
export async function openDecisionFromNotice(page: Page, nodeLabel: string): Promise<Locator> {
  await waitingNotice(page, nodeLabel).getByRole('button', { name: 'Decide', exact: true }).click();
  const form = propertiesPanel(page).getByRole('group', { name: 'Decision' });
  await expect(form).toBeAttached();
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
