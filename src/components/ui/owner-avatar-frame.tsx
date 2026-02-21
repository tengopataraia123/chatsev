import { cn } from '@/lib/utils';
import { isOwner, isOwnerById } from '@/utils/ownerUtils';

interface OwnerAvatarFrameProps {
  children: React.ReactNode;
  username?: string | null;
  userId?: string | null;
  className?: string;
}

const OwnerAvatarFrame = ({ children, username, userId, className }: OwnerAvatarFrameProps) => {
  const isOwnerUser = (username && isOwner(username)) || (userId && isOwnerById(userId));

  if (!isOwnerUser) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Animated gradient border - perfectly circular */}
      <div 
        className="absolute -inset-[3px] rounded-full owner-avatar-frame z-0"
        style={{ 
          borderRadius: '9999px',
          aspectRatio: '1 / 1'
        }} 
      />
      {/* Avatar content */}
      <div className="relative z-10 rounded-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default OwnerAvatarFrame;
