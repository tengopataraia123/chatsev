import { cn } from '@/lib/utils';
import { isOwner } from '@/utils/ownerUtils';

interface OwnerUsernameProps {
  username: string;
  className?: string;
  showCrown?: boolean;
}

const OwnerUsername = ({ username, className, showCrown = true }: OwnerUsernameProps) => {
  if (!isOwner(username)) {
    return <span className={className}>{username}</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {showCrown && <span className="text-amber-400">👑</span>}
      <span className="owner-username-gradient font-bold">
        {username}
      </span>
    </span>
  );
};

export default OwnerUsername;
