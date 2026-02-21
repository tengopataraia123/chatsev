import { memo } from 'react';
import { X } from 'lucide-react';
import { SelectedMood, formatMoodDisplay } from './moodData';

interface MoodTagProps {
  mood: SelectedMood;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

const MoodTag = memo(({ mood, onRemove, size = 'md' }: MoodTagProps) => {
  return (
    <span className={`inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full ${
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    }`}>
      <span>{formatMoodDisplay(mood)}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
        >
          <X className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </span>
  );
});

MoodTag.displayName = 'MoodTag';
export default MoodTag;
