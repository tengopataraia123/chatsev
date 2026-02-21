import { forwardRef } from "react";
import UserAvatar from "./UserAvatar";
import { cn } from "@/lib/utils";

interface GenderAvatarProps {
  src?: string | null;
  gender?: string | null;
  username?: string;
  userId?: string | null;
  className?: string;
  fallbackClassName?: string;
  showStoryRing?: boolean;
  enableStoryClick?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
}

/**
 * GenderAvatar - Backwards compatible wrapper around UserAvatar
 * Now supports Story Ring functionality when userId is provided
 */
export const GenderAvatar = forwardRef<HTMLDivElement, GenderAvatarProps>(
  ({ src, gender, username, userId, className, fallbackClassName, showStoryRing = true, enableStoryClick = true, onClick }, ref) => {
    return (
      <UserAvatar
        ref={ref}
        userId={userId}
        src={src}
        username={username}
        gender={gender}
        className={className}
        fallbackClassName={fallbackClassName}
        showStoryRing={showStoryRing}
        enableStoryClick={enableStoryClick}
        onClick={onClick}
      />
    );
  }
);

GenderAvatar.displayName = "GenderAvatar";

export default GenderAvatar;
