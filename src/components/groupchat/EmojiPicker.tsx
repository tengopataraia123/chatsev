import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  const emojiCategories = [
    {
      name: 'სახეები',
      emojis: ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲']
    },
    {
      name: 'ჟესტები',
      emojis: ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '👏', '🙌', '👐', '🤲', '🙏', '💪', '🦾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝']
    },
    {
      name: 'ობიექტები',
      emojis: ['🎉', '🎊', '🎁', '🎈', '🎂', '🍰', '🧁', '🍕', '🍔', '🌹', '🌺', '🌸', '🌼', '🌻', '⭐', '🌟', '✨', '⚡', '🔥', '💥', '🎵', '🎶', '🎸', '🎹', '🎤', '🎬', '📱', '💻', '⌚', '📷', '🎮', '🕹️', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎾', '🏈', '🚗', '✈️', '🚀', '🌍', '🌙', '☀️', '🌈', '☁️']
    }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-3 max-w-full shadow-lg w-72">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">ემოჯი</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {emojiCategories.map((category) => (
          <div key={category.name}>
            <p className="text-xs text-muted-foreground mb-1">{category.name}</p>
            <div className="flex flex-wrap gap-1">
              {category.emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => onSelect(emoji)}
                  className="text-xl hover:bg-secondary rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
