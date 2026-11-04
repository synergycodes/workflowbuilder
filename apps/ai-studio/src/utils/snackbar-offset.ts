const GAP_ABOVE_DOCK_PX = 12;

/** How far above the viewport bottom the editor's snackbars go to sit a gap above the execution log. */
export function snackbarOffsetBottom(dockTop: number, viewportHeight: number) {
  return Math.round(viewportHeight - dockTop + GAP_ABOVE_DOCK_PX);
}
