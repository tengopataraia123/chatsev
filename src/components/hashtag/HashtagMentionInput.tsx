import { useState, useRef, useEffect, useCallback, memo, forwardRef, useImperativeHandle } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useMentionSuggestions, MentionUser, HashtagSuggestion } from './useMentionSuggestions';
import { cn } from '@/lib/utils';
import { Users, Hash, Loader2 } from 'lucide-react';

export interface HashtagMentionInputRef {
  focus: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
}

interface HashtagMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

type SuggestionType = 'mention' | 'hashtag' | null;

const HashtagMentionInput = memo(forwardRef<HashtagMentionInputRef, HashtagMentionInputProps>(({
  value,
  onChange,
  placeholder = 'რას ფიქრობთ?',
  className,
  disabled = false,
  autoFocus = false,
  minRows = 3,
  maxRows = 10,
  onKeyDown
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestionType, setSuggestionType] = useState<SuggestionType>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [triggerStart, setTriggerStart] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    mentionSuggestions,
    hashtagSuggestions,
    loading,
    searchMentions,
    searchHashtags,
    clearSuggestions
  } = useMentionSuggestions();

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getValue: () => value,
    setValue: (newValue: string) => onChange(newValue)
  }), [value, onChange]);

  // Get current word being typed at cursor
  const getCurrentTrigger = useCallback((text: string, pos: number): { type: SuggestionType; query: string; start: number } | null => {
    const beforeCursor = text.slice(0, pos);
    
    // Find @ or # trigger
    const mentionMatch = beforeCursor.match(/@([\wა-ჰ]*)$/);
    const hashtagMatch = beforeCursor.match(/#([\wა-ჰ]*)$/);
    
    if (mentionMatch) {
      return {
        type: 'mention',
        query: mentionMatch[1],
        start: pos - mentionMatch[0].length
      };
    }
    
    if (hashtagMatch) {
      return {
        type: 'hashtag',
        query: hashtagMatch[1],
        start: pos - hashtagMatch[0].length
      };
    }
    
    return null;
  }, []);

  // Handle text change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(newPosition);
    
    const trigger = getCurrentTrigger(newValue, newPosition);
    
    if (trigger) {
      setSuggestionType(trigger.type);
      setTriggerStart(trigger.start);
      setSearchQuery(trigger.query);
      setShowDropdown(true);
      setSelectedIndex(0);
      
      if (trigger.type === 'mention') {
        searchMentions(trigger.query);
      } else if (trigger.type === 'hashtag') {
        searchHashtags(trigger.query);
      }
    } else {
      setShowDropdown(false);
      setSuggestionType(null);
      clearSuggestions();
    }
  }, [onChange, getCurrentTrigger, searchMentions, searchHashtags, clearSuggestions]);

  // Handle selection change (arrow keys, click)
  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPosition(target.selectionStart || 0);
  }, []);

  // Insert selected suggestion
  const insertSuggestion = useCallback((suggestion: MentionUser | HashtagSuggestion) => {
    if (triggerStart === null) return;
    
    let insertText = '';
    if ('username' in suggestion) {
      // Mention
      insertText = `@${suggestion.username} `;
    } else {
      // Hashtag
      insertText = `#${suggestion.tag} `;
    }
    
    const beforeTrigger = value.slice(0, triggerStart);
    const afterCursor = value.slice(cursorPosition);
    const newValue = beforeTrigger + insertText + afterCursor;
    
    onChange(newValue);
    setShowDropdown(false);
    setSuggestionType(null);
    clearSuggestions();
    
    // Move cursor after inserted text
    setTimeout(() => {
      const newPos = triggerStart + insertText.length;
      textareaRef.current?.setSelectionRange(newPos, newPos);
      textareaRef.current?.focus();
    }, 0);
  }, [value, triggerStart, cursorPosition, onChange, clearSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown) {
      onKeyDown?.(e);
      return;
    }

    const suggestions = suggestionType === 'mention' ? mentionSuggestions : hashtagSuggestions;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        if (suggestions.length > 0) {
          e.preventDefault();
          insertSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        clearSuggestions();
        break;
      default:
        onKeyDown?.(e);
    }
  }, [showDropdown, suggestionType, mentionSuggestions, hashtagSuggestions, selectedIndex, insertSuggestion, clearSuggestions, onKeyDown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, showDropdown]);

  const suggestions = suggestionType === 'mention' ? mentionSuggestions : hashtagSuggestions;

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={minRows}
        className={cn(
          "resize-none transition-all",
          className
        )}
        style={{
          minHeight: `${minRows * 1.5}rem`,
          maxHeight: `${maxRows * 1.5}rem`
        }}
      />
      
      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-b border-border text-xs text-muted-foreground">
            {suggestionType === 'mention' ? (
              <>
                <Users className="w-3.5 h-3.5" />
                <span>მომხმარებლები</span>
              </>
            ) : (
              <>
                <Hash className="w-3.5 h-3.5" />
                <span>ჰეშთეგები</span>
              </>
            )}
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" />}
          </div>
          
          {/* Mention Suggestions */}
          {suggestionType === 'mention' && mentionSuggestions.map((user, index) => (
            <button
              key={user.user_id}
              data-index={index}
              onClick={() => insertSuggestion(user)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                index === selectedIndex ? "bg-primary/10" : "hover:bg-secondary/50"
              )}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">@{user.username}</span>
                  {user.is_friend && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                      მეგობარი
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          
          {/* Hashtag Suggestions */}
          {suggestionType === 'hashtag' && hashtagSuggestions.map((tag, index) => (
            <button
              key={tag.tag}
              data-index={index}
              onClick={() => insertSuggestion(tag)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                index === selectedIndex ? "bg-primary/10" : "hover:bg-secondary/50"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">#{tag.tag}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {tag.count} პოსტი
                </span>
              </div>
            </button>
          ))}
          
          {/* Empty state */}
          {suggestions.length === 0 && !loading && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {suggestionType === 'mention' ? 'მომხმარებელი ვერ მოიძებნა' : 'ჰეშთეგი ვერ მოიძებნა'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}));

HashtagMentionInput.displayName = 'HashtagMentionInput';

export default HashtagMentionInput;
