import { Component, type ReactNode } from 'react';

type Props = { fallback: ReactNode; onError?: () => void; children: ReactNode };

/** Renders `fallback` in place of a form that throws while it is built, instead of unmounting the page with it. */
export class FormBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError?.();
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
