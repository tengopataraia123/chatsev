import { memo } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnonymousToggleProps {
  isAnonymous: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

const AnonymousToggle = memo(({ isAnonymous, onToggle, disabled }: AnonymousToggleProps) => {
  return (
    <button
      onClick={() => onToggle(!isAnonymous)}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-full transition-all flex-shrink-0",
        isAnonymous
          ? "bg-violet-500/20 text-violet-500 hover:bg-violet-500/30"
          : "hover:bg-muted text-muted-foreground"
      )}
      title={isAnonymous ? 'ანონიმური რეჟიმი ჩართულია' : 'ანონიმური რეჟიმი'}
    >
      {isAnonymous ? (
        <EyeOff className="w-4.5 h-4.5" />
      ) : (
        <Eye className="w-4.5 h-4.5" />
      )}
    </button>
  );
});

AnonymousToggle.displayName = 'AnonymousToggle';

export default AnonymousToggle;
