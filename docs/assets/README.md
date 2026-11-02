# README assets

## `workflow-builder-run.png`

The hero image of the root README: one run, seen in AI Studio and in Temporal Web UI, side by side. Neither half is edited; the captions above the halves are the only addition.

|             |                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Template    | Refund Review (`apps/ai-studio/src/data/refund-review-flow.ts`)                                 |
| State       | Waiting at "Review Refund", the decision form open in the Properties panel, the log collapsed   |
| Workflow Id | `execution-a4bd88f3-e891-435a-accd-cb20d7db9cc9`                                                |
| Commit      | `f8ec6e94` on `main`                                                                            |
| Temporal    | Server 1.29.1 (`temporalio/auto-setup`), Web UI 2.55.0 (`temporalio/ui`), TypeScript SDK 1.23.0 |
| Model       | `mistralai/mistral-small-3.2-24b-instruct` through OpenRouter                                   |
| Captured    | 2026-11-02, Chromium via Playwright, light theme                                                |

Left half: AI Studio at 1920x1080 CSS pixels, canvas zoomed to 0.89 so the first three nodes and the decision panel fill the frame. Right half: Temporal Web UI at 1440x1500, Event History in Compact view, side navigation collapsed, cropped from "Back to Workflows" to the end of the table and scaled to the left half's height. Composed with Pillow on a `#f3f4f6` background and quantized to 256 colours.

To retake it: run the full stack (root README, Path C), open the Refund Review template, press Run, wait for "Waiting for decision", click Decide on the node, collapse the Execution log, and open the run's Event History in Temporal Web UI in Compact view.
