import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye } from 'lucide-react';

interface SeenUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  seen_at: string;
}

interface SeenByIndicatorProps {
  seenUsers: SeenUser[];
  onClick: () => void;
  maxAvatars?: number;
}

const SeenByIndicator = ({ seenUsers, onClick, maxAvatars = 3 }: SeenByIndicatorProps) => {
  if (seenUsers.length === 0) return null;

  const displayedUsers = seenUsers.slice(0, maxAvatars);
  const remainingCount = seenUsers.length - maxAvatars;
  
  // Format the "Seen by" text
  const getSeenText = () => {
    if (seenUsers.length === 1) {
      return `ნახა ${seenUsers[0].username}`;
    } else if (seenUsers.length === 2) {
      return `ნახეს ${seenUsers[0].username}, ${seenUsers[1].username}`;
    } else {
      return `ნახა ${seenUsers[0].username} და კიდევ ${seenUsers.length - 1}`;
    }
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 mt-1 group cursor-pointer"
    >
      {/* Small avatars row */}
      <div className="flex -space-x-1.5">
        {displayedUsers.map((user) => (
          <Avatar key={user.user_id} className="w-4 h-4 border border-background">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-[6px] bg-muted">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {remainingCount > 0 && (
          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[6px] font-medium border border-background">
            +{remainingCount}
          </div>
        )}
      </div>
      
      {/* Text */}
      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
        <Eye className="w-2.5 h-2.5" />
        {getSeenText()}
      </span>
    </button>
  );
};

export default SeenByIndicator;
