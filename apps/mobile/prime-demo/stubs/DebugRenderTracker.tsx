import type { ComponentType, ReactNode } from 'react';

function DebugRenderTracker({ children }: { children: ReactNode }) {
  return children;
}

const withDebugRenderTracker = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => WrappedComponent;

export { DebugRenderTracker, withDebugRenderTracker };
