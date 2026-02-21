import { Users } from 'lucide-react';

interface OnlineUser {
  user_id: string;
  username: string;
  last_seen: string | null;
}

interface OnlineUsersStripProps {
  users: OnlineUser[];
  onMention: (username: string) => void;
}

const OnlineUsersStrip = ({ users, onMention }: OnlineUsersStripProps) => {
  // Sort by last_seen descending (most recent first)
  const sortedUsers = [...users].sort((a, b) => {
    const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
    const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
    return bTime - aTime;
  });

  if (users.length === 0) {
    return (
      <div className="px-4 py-2 border-b border-border bg-gradient-to-r from-card to-secondary/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span className="text-xs">ოთახში არავინ არ არის</span>
        </div>
      </div>
    );
  }

  // Format usernames - all visible with minimal line spacing
  return (
    <div className="px-3 py-0.5 border-b border-border bg-gradient-to-r from-card to-secondary/30">
      <div className="flex items-start gap-1.5">
        <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <p className="flex-1 min-w-0 text-sm leading-snug flex flex-wrap items-baseline">
          <span className="text-muted-foreground leading-snug mr-1">
            online ({sortedUsers.length}):{' '}
          </span>
          {sortedUsers.map((user, index) => (
            <span key={user.user_id} className="leading-snug inline-flex items-baseline">
              <button
                onClick={() => onMention(user.username)}
                className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors leading-snug align-baseline whitespace-nowrap"
                title={`დამენშენე @${user.username}`}
              >
                {user.username}
              </button>
              {index < sortedUsers.length - 1 && (
                <span className="text-muted-foreground leading-snug mr-1.5">,{' '}</span>
              )}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};

export default OnlineUsersStrip;
