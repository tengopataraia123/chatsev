import { useState, useRef, useCallback, memo, useImperativeHandle, forwardRef } from 'react';
import { Send, Film, Lock, Paperclip, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import VoiceRecorder from '@/components/voice/VoiceRecorder';
import GifPicker from '@/components/gif/GifPicker';
import AnonymousToggle from './AnonymousToggle';

interface MentionUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  last_seen: string | null;
  online_visible_until: string | null;
}

interface GroupChatComposerProps {
  userId: string | undefined;
  disabled?: boolean;
  isPrivateMessage?: boolean;
  hasImage?: boolean;
  replyingTo?: { id: string; user_id: string; username: string; content: string | null } | null;
  allProfiles: MentionUser[];
  externalSelectedMention?: MentionUser | null;
  isAnonymous?: boolean;
  onAnonymousToggle?: (value: boolean) => void;
  showAnonymousToggle?: boolean;
  onSend: (message: string, selectedMention: MentionUser | null, isPrivate: boolean) => void;
  onImageSelect: (file: File) => void;
  onVideoClick: () => void;
  onVoiceSend: (url: string, replyingTo?: { id: string; user_id: string; username: string } | null, selectedMention?: MentionUser | null, isPrivate?: boolean) => void;
  onGifSelect: (gif: { id: string; file_original: string }) => void;
  onCancelReply?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export interface GroupChatComposerHandle {
  insertMention: (username: string) => void;
}

const GroupChatComposer = memo(forwardRef<GroupChatComposerHandle, GroupChatComposerProps>(({
  userId,
  disabled = false,
  isPrivateMessage: externalIsPrivate = false,
  hasImage = false,
  replyingTo,
  allProfiles,
  externalSelectedMention = null,
  isAnonymous = false,
  onAnonymousToggle,
  showAnonymousToggle = false,
  onSend,
  onImageSelect,
  onVideoClick,
  onVoiceSend,
  onGifSelect,
  onCancelReply,
  onRefresh,
  refreshing = false
}, ref) => {
  // Local state - isolated from parent
  const [message, setMessage] = useState('');

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [localSelectedMention, setLocalSelectedMention] = useState<MentionUser | null>(null);
  
  // Use external isPrivateMessage directly instead of local state
  const isPrivateMessage = externalIsPrivate;
  // Use external mention if provided, otherwise use local
  const selectedMention = externalSelectedMention || localSelectedMention;
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expose insertMention method to parent - without @ symbol
  useImperativeHandle(ref, () => ({
    insertMention: (username: string) => {
      // Store the mention user for later use
      const user = allProfiles.find(p => p.username.toLowerCase() === username.toLowerCase());
      if (user) {
        setLocalSelectedMention(user);
      }
      
      const mentionText = `${username} `;
      
      // Check if mention already exists at the end to avoid duplicates
      if (message.trimEnd().endsWith(username)) {
        inputRef.current?.focus();
        return;
      }
      
      // Add mention to current position or end
      setMessage(prev => {
        const trimmed = prev.trimEnd();
        if (trimmed.length > 0 && !trimmed.endsWith(' ')) {
          return trimmed + ' ' + mentionText;
        }
        return prev + mentionText;
      });
      
      // Focus input and move cursor to end
      setTimeout(() => {
        inputRef.current?.focus();
        if (inputRef.current) {
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 0);
    }
  }), [message, allProfiles]);

  // Check if the message only contains a mention (e.g., "@username " or "@username")
  // In this case, we should still show the voice icon
  const messageWithoutMentions = message.replace(/@\w+\s*/g, '').trim();
  const hasRealText = messageWithoutMentions.length > 0;

  // Handle input change with debounced mention detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Debounce mention detection
    if (mentionTimeoutRef.current) {
      clearTimeout(mentionTimeoutRef.current);
    }
    
    mentionTimeoutRef.current = setTimeout(() => {
      const lastAtIndex = value.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const afterAt = value.slice(lastAtIndex + 1);
        if (!afterAt.includes(' ')) {
          setShowMentionPicker(true);
          const filtered = allProfiles.filter(u => 
            u.user_id !== userId &&
            u.username.toLowerCase().includes(afterAt.toLowerCase())
          ).slice(0, 10);
          setMentionUsers(filtered);
        } else {
          setShowMentionPicker(false);
        }
      } else {
        setShowMentionPicker(false);
      }
    }, 200);
  }, [allProfiles, userId]);

  const selectMention = useCallback((user: MentionUser) => {
    const lastAtIndex = message.lastIndexOf('@');
    const newText = message.slice(0, lastAtIndex) + `@${user.username} `;
    setMessage(newText);
    setLocalSelectedMention(user);
    setShowMentionPicker(false);
    inputRef.current?.focus();
  }, [message]);

  const handleSend = useCallback(() => {
    if (!message.trim() && !hasImage) return;
    onSend(message, selectedMention, isPrivateMessage);
    setMessage('');
    setLocalSelectedMention(null);
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [message, selectedMention, isPrivateMessage, onSend, hasImage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
    e.target.value = '';
  }, [onImageSelect]);

  const handleGifSelect = useCallback((gif: { id: string; file_original: string }) => {
    onGifSelect(gif);
    setShowGifPicker(false);
  }, [onGifSelect]);


  const handleInsertShortcode = useCallback((shortcode: string) => {
    setMessage(prev => prev + shortcode);
    setShowGifPicker(false);
  }, []);

  return (
    <div className="flex-shrink-0 border-t border-border p-2 bg-card relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />

      {/* Mention Picker */}
      {showMentionPicker && mentionUsers.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 bg-card border border-border rounded-t-lg max-h-40 overflow-y-auto">
          {mentionUsers.map(user => (
            <button
              key={user.user_id}
              onClick={() => selectMention(user)}
              className="w-full flex items-center gap-2 p-2 hover:bg-accent/50 text-left"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm">{user.username}</span>
            </button>
          ))}
        </div>
      )}


      {/* GIF Picker */}
      {showGifPicker && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
          insertShortcodeMode={true}
          onInsertShortcode={handleInsertShortcode}
        />
      )}

      <div className="flex items-end gap-0">
        {/* FILE dropdown */}
        <div className={`transition-all duration-200 overflow-hidden ${hasRealText ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-muted rounded-full transition-colors flex-shrink-0" disabled={disabled}>
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer">
                <ImageIcon className="w-4 h-4" />
                <span>ფოტო</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onVideoClick} className="gap-2 cursor-pointer" disabled={disabled}>
                <Film className="w-4 h-4" />
                <span>ვიდეო</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* GIF button */}
        <button
          onClick={() => setShowGifPicker(true)}
          className="px-2 py-1 hover:bg-muted rounded-full transition-colors text-sm font-bold text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          GIF
        </button>

        {/* Anonymous toggle */}
        {showAnonymousToggle && onAnonymousToggle && (
          <AnonymousToggle
            isAnonymous={isAnonymous}
            onToggle={onAnonymousToggle}
            disabled={disabled}
          />
        )}
        
        {/* Textarea */}
        <div className="flex-1 relative min-w-0">
          <Textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              requestAnimationFrame(() => {
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 160) + 'px';
              });
            }}
            placeholder="შეტყობინება..."
            rows={1}
            className="min-h-[44px] max-h-[160px] py-2.5 px-3 resize-none overflow-y-auto bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary text-base leading-6"
            style={{ height: 'auto' }}
            disabled={disabled}
          />
        </div>
        
        {/* Voice recorder */}
        <div className={`transition-all duration-200 overflow-hidden ${hasRealText ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
          {userId && (
            <VoiceRecorder
              userId={userId}
              onVoiceSend={(url) => onVoiceSend(
                url, 
                replyingTo ? { id: replyingTo.id, user_id: replyingTo.user_id, username: replyingTo.username } : null,
                selectedMention,
                externalIsPrivate || (!!selectedMention)
              )}
              disabled={disabled}
            />
          )}
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
            title="განახლება"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        
        {/* Send button - flat, no background */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && !hasImage)}
          className={`p-1.5 rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${
            isPrivateMessage 
              ? 'text-amber-500 hover:bg-amber-500/10' 
              : 'text-primary hover:bg-primary/10'
          }`}
        >
          {isPrivateMessage ? <Lock className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}));

GroupChatComposer.displayName = 'GroupChatComposer';

export default GroupChatComposer;
