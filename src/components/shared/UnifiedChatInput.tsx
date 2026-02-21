import { useRef, useState, useCallback, memo } from 'react';
import { Send, Paperclip, ImageIcon, Film, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import GifPicker from '@/components/gif/GifPicker';
import { cn } from '@/lib/utils';

interface UnifiedChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  // Media options
  showMediaButtons?: boolean;
  onImageSelect?: (file: File) => void;
  onVideoClick?: () => void;
  // GIF options
  showGifButton?: boolean;
  onGifSelect?: (gif: { id: string; file_original: string }) => void;
  insertShortcodeMode?: boolean;
  onInsertShortcode?: (shortcode: string) => void;
  // Voice options
  voiceComponent?: React.ReactNode;
  // Custom send button
  sendIcon?: React.ReactNode;
  sendButtonClassName?: string;
  // Max rows for textarea
  maxRows?: number;
}

const UnifiedChatInput = memo(({
  value,
  onChange,
  onSend,
  placeholder = 'შეტყობინება...',
  disabled = false,
  sending = false,
  showMediaButtons = false,
  onImageSelect,
  onVideoClick,
  showGifButton = true,
  onGifSelect,
  insertShortcodeMode = false,
  onInsertShortcode,
  voiceComponent,
  sendIcon,
  sendButtonClassName = 'bg-primary text-primary-foreground hover:bg-primary/90',
  maxRows = 6,
}: UnifiedChatInputProps) => {
  const [showGifPicker, setShowGifPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeRafRef = useRef<number | null>(null);
  const lastHeightRef = useRef<number>(36);

  // Check if input has text (for hiding/showing icons)
  const hasText = value.length > 0;

  // Optimized auto-resize using requestAnimationFrame - throttled
  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement) => {
    // Cancel any pending RAF
    if (resizeRafRef.current) {
      cancelAnimationFrame(resizeRafRef.current);
    }

    resizeRafRef.current = requestAnimationFrame(() => {
      // Reset to auto to measure
      textarea.style.height = 'auto';
      
      const scrollHeight = textarea.scrollHeight;
      const lineHeight = 22;
      const maxHeight = lineHeight * maxRows + 14;
      const newHeight = Math.max(36, Math.min(scrollHeight, maxHeight));
      
      // Only update if height actually changed
      if (newHeight !== lastHeightRef.current) {
        textarea.style.height = `${newHeight}px`;
        lastHeightRef.current = newHeight;
      } else {
        textarea.style.height = `${lastHeightRef.current}px`;
      }
    });
  }, [maxRows]);

  // Direct onChange handler - no debounce on text, just update immediately
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    adjustTextareaHeight(e.target);
  }, [onChange, adjustTextareaHeight]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageSelect) {
      onImageSelect(file);
    }
    e.target.value = '';
  };

  const handleGifSelect = (gif: { id: string; file_original: string }) => {
    if (onGifSelect) {
      onGifSelect(gif);
    }
    setShowGifPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
    // Shift+Enter adds new line (default behavior)
  };

  const handleSend = () => {
    if (value.trim()) {
      onSend();
      // Reset textarea height after sending
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }, 0);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        
        {/* FILE dropdown - hides when typing (WhatsApp-style) */}
        <div
          className={cn(
            "transition-all duration-200 ease-in-out overflow-hidden",
            hasText ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          {showMediaButtons && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 hover:bg-muted rounded-full transition-colors flex-shrink-0">
                  <Paperclip className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[140px]">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer">
                  <ImageIcon className="w-4 h-4" />
                  <span>ფოტო</span>
                </DropdownMenuItem>
                {onVideoClick && (
                  <DropdownMenuItem onClick={onVideoClick} className="gap-2 cursor-pointer">
                    <Film className="w-4 h-4" />
                    <span>ვიდეო</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* GIF button - always visible */}
        {showGifButton && (
          <button
            onClick={() => setShowGifPicker(!showGifPicker)}
            className="px-2 py-1 hover:bg-muted rounded-full transition-colors text-xs font-bold text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            GIF
          </button>
        )}
        
        {/* Auto-resize textarea */}
        <div className="flex-1 relative min-w-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="!min-h-[36px] max-h-[150px] py-2 px-3 resize-none overflow-y-auto bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary text-sm leading-5"
            style={{ height: `${lastHeightRef.current}px` }}
          />
        </div>
        
        {/* Voice recorder slot - hides when typing (WhatsApp-style) */}
        <div
          className={cn(
            "transition-all duration-200 ease-in-out overflow-hidden",
            hasText ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          {voiceComponent}
        </div>
        
        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || sending || !value.trim()}
          className={`p-2.5 rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${sendButtonClassName}`}
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            sendIcon || <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
          <GifPicker
            onSelect={handleGifSelect}
            onClose={() => setShowGifPicker(false)}
            insertShortcodeMode={insertShortcodeMode}
            onInsertShortcode={(shortcode) => {
              if (onInsertShortcode) {
                onInsertShortcode(shortcode);
              } else {
                onChange(value + shortcode);
              }
              setShowGifPicker(false);
            }}
          />
        </div>
      )}

    </div>
  );
});

UnifiedChatInput.displayName = 'UnifiedChatInput';

export default UnifiedChatInput;
