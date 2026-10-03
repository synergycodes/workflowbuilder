import { vi } from 'vitest';

// jsdom has no EventSource.
export class FakeEventSource extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static instances: FakeEventSource[] = [];

  readyState: number = FakeEventSource.CONNECTING;

  constructor(readonly url: string) {
    super();
    FakeEventSource.instances.push(this);
  }

  get closed() {
    return this.readyState === FakeEventSource.CLOSED;
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  emit(data: unknown) {
    this.fire(new MessageEvent('message', { data: JSON.stringify(data) }), FakeEventSource.OPEN);
  }

  // Network error: the browser keeps the source and retries.
  blip() {
    this.fire(new Event('error'), FakeEventSource.CONNECTING);
  }

  // Non-200 or wrong MIME type: the browser closes the source, no retry.
  refuse() {
    if (this.closed) return;
    this.readyState = FakeEventSource.CLOSED;
    this.dispatchEvent(new Event('error'));
  }

  // A closed EventSource dispatches nothing, so neither may the double.
  private fire(event: Event, nextReadyState: number) {
    if (this.closed) return;
    this.readyState = nextReadyState;
    this.dispatchEvent(event);
  }
}

export function installFakeEventSource() {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
}

export const openStreams = () => FakeEventSource.instances.filter((stream) => !stream.closed);

export function latestStream(): FakeEventSource {
  const stream = FakeEventSource.instances.at(-1);
  if (!stream) throw new Error('no EventSource was opened');
  return stream;
}
