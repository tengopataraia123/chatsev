import { memo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';

interface PostComposerBarProps {
  onOpenModal: () => void;
}

const PostComposerBar = memo(({ onOpenModal }: PostComposerBarProps) => {
  const { profile } = useAuth();

  return (
    <div className="bg-card border-b border-border px-3 py-2.5">
      <div className="flex items-center gap-3">
        {/* User Avatar */}
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.username || 'User'} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
            {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Clickable Input Bar */}
        <button
          onClick={onOpenModal}
          className="flex-1 h-10 px-4 rounded-full bg-muted/50 hover:bg-muted/70 text-left text-muted-foreground text-sm transition-colors"
        >
          რას ფიქრობთ?
        </button>
      </div>
    </div>
  );
});

PostComposerBar.displayName = 'PostComposerBar';

export default PostComposerBar;
