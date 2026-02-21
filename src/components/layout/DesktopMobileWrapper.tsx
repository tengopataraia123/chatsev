import { ReactNode, memo } from 'react';

interface DesktopMobileWrapperProps {
  children: ReactNode;
}

/**
 * Desktop wrapper that renders mobile UI at full width.
 * Uses the same mobile components but expanded for desktop screens.
 */
const DesktopMobileWrapper = memo(({ children }: DesktopMobileWrapperProps) => {
  return (
    <div className="w-full h-full min-h-screen bg-background">
      {children}
    </div>
  );
});

DesktopMobileWrapper.displayName = 'DesktopMobileWrapper';

export default DesktopMobileWrapper;
