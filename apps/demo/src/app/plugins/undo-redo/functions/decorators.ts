import {
  processSnapshotWatching,
  startSnapshotWatching,
  stopSnapshotWatching,
  takeSnapshot,
} from '../stores/use-undo-redo-store';

type TrackFutureChangeDecoratorParams = {
  params: unknown[];
};

const dragCallbackByCodename: {
  [codename: string]: (name: string) => void;
} = {
  nodeDragStart: startSnapshotWatching,
  nodeDragChange: processSnapshotWatching,
  nodeDragStop: stopSnapshotWatching,
};

export function trackFutureChangeDecorator({ params }: TrackFutureChangeDecoratorParams) {
  const codename = typeof params[0] === 'string' ? params[0] : '';

  if (['undo', 'redo'].includes(codename)) {
    // Triggered by history skipping takeSnapshot()
    return;
  }

  const specialDragCallback = dragCallbackByCodename[codename];
  if (specialDragCallback) {
    specialDragCallback('nodeDrag');

    return;
  }

  takeSnapshot();
}
