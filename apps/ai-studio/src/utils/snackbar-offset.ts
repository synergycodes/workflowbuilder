const GAP_ABOVE_DOCK_PX = 12;

/** How far above the viewport bottom the editor's snackbars go to sit a gap above the execution log. */
export function snackbarOffsetBottom(dockTop: number, viewportHeight: number) {
  const aboveDock = viewportHeight - dockTop + GAP_ABOVE_DOCK_PX;
  // Past half the viewport the stack overlaps the log rather than leaving the screen.
  return Math.round(Math.min(aboveDock, viewportHeight / 2));
}
