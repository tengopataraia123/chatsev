import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  ImageIcon, 
  Mic, 
  Camera, 
  Film, 
  Smile, 
  X,
  Loader2,
  Lock
} from 'lucide-react';
import EmojiPicker from '@/components/groupchat/EmojiPicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import GifPicker from '@/components/gif/GifPicker';
import { cn } from '@/lib/utils';
import { ChatTheme, CHAT_THEME_COLORS, MessengerMessage } from './types';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { VoiceRecordingOverlay, MediaPreview } from './components';
import { useS3Upload } from '@/hooks/useS3Upload';
import { useToast } from '@/hooks/use-toast';
import { getGifByShortcodeSync } from '@/components/gif/useGifCache';

interface MessengerChatInputProps {
  onSendMessage: (content: string) => void;
  onSendMedia?: (params: {
    content?: string;
    image_urls?: string[];
    video_url?: string;
    voice_url?: string;
    voice_duration_seconds?: number;
  }) => void;
  onSendGif?: (gifId: string, gifUrl: string) => void;
  onTyping?: (isTyping: boolean) => void;
  theme: ChatTheme;
  replyTo?: MessengerMessage | null;
  onCancelReply?: () => void;
  editingMessage?: MessengerMessage | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (content: string) => void;
  disabled?: boolean;
  customEmoji?: string;
  // Media permission (includes admin bypass)
  canSendMedia?: boolean;
}

const MessengerChatInput = memo(({
  onSendMessage,
  onSendMedia,
  onSendGif,
  onTyping,
  theme,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  disabled,
  customEmoji = '👍',
  canSendMedia = true // Default to true for backwards compatibility
}: MessengerChatInputProps) => {
  const [message, setMessage] = useState(editingMessage?.content || '');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [mediaCaption, setMediaCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const themeColors = CHAT_THEME_COLORS[theme];
  const hasText = message.trim().length > 0;
  
  const { toast } = useToast();
  const { upload, uploading: s3Uploading } = useS3Upload({ folder: 'messenger' });
  
  const {
    isRecording,
    duration: recordingDuration,
    error: voiceError,
    startRecording,
    stopAndSend,
    cancelRecording,
  } = useVoiceRecorder();

  // Show voice error toast
  useEffect(() => {
    if (voiceError) {
      toast({
        title: 'შეცდომა',
        description: voiceError,
        variant: 'destructive',
      });
    }
  }, [voiceError, toast]);

  // WhatsApp-like: Stop recording and send immediately
  const handleVoiceSend = async () => {
    if (!onSendMedia) return;
    
    // Check friend status for voice messages
    if (!canSendMedia) {
      toast({
        title: 'შეზღუდვა',
        description: 'ხმოვანი შეტყობინების გაგზავნა შესაძლებელია მხოლოდ მეგობრებს შორის.',
        variant: 'destructive',
      });
      cancelRecording();
      return;
    }
    
    // Stop recording and get blob
    const result = await stopAndSend();
    if (!result) return;
    
    setIsUploading(true);
    try {
      const voiceFile = new File([result.blob], `voice-${Date.now()}.webm`, {
        type: result.blob.type,
      });
      
      const uploadResult = await upload(voiceFile, 'voice-messages');
      if (uploadResult?.url) {
        onSendMedia({
          voice_url: uploadResult.url,
          voice_duration_seconds: result.duration,
        });
      }
    } catch (err) {
      console.error('Voice upload error:', err);
      toast({
        title: 'შეცდომა',
        description: 'ხმოვანი შეტყობინების ატვირთვა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    onTyping?.(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping?.(false);
    }, 2000);
  }, [onTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping();
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleSend = () => {
    if (!message.trim()) return;
    
    // Convert shortcodes like .შელბი. to [GIF:url] format
    let processedMessage = message.trim();
    const shortcodeRegex = /\.[^\s.]+\./g;
    const matches = processedMessage.match(shortcodeRegex);
    
    if (matches) {
      matches.forEach(shortcode => {
        const gif = getGifByShortcodeSync(shortcode);
        if (gif) {
          processedMessage = processedMessage.replace(shortcode, `[GIF:${gif.file_original}]`);
        }
      });
    }
    
    if (editingMessage && onSaveEdit) {
      onSaveEdit(processedMessage);
    } else {
      onSendMessage(processedMessage);
    }
    
    setMessage('');
    onTyping?.(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && (editingMessage || replyTo)) {
      editingMessage ? onCancelEdit?.() : onCancelReply?.();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    // Check friend status
    if (!canSendMedia) {
      toast({
        title: 'შეზღუდვა',
        description: 'ფაილების გაგზავნა შესაძლებელია მხოლოდ მეგობრებს შორის.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Validate files
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: 'ფაილი ზედმეტად დიდია',
          description: `მაქსიმალური ზომა: ${type === 'video' ? '100MB' : '10MB'}`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles]);
    }
    
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMedia = async (caption: string) => {
    if (!onSendMedia || pendingFiles.length === 0) return;
    
    // Double-check friend status
    if (!canSendMedia) {
      toast({
        title: 'შეზღუდვა',
        description: 'ფაილების გაგზავნა შესაძლებელია მხოლოდ მეგობრებს შორის.',
        variant: 'destructive',
      });
      setPendingFiles([]);
      return;
    }
    
    setIsUploading(true);
    try {
      const imageUrls: string[] = [];
      let videoUrl: string | undefined;
      
      for (const file of pendingFiles) {
        const folder = file.type.startsWith('video/') ? 'videos' : 'chat-images';
        const result = await upload(file, folder);
        
        if (result?.url) {
          if (file.type.startsWith('video/')) {
            videoUrl = result.url;
          } else {
            imageUrls.push(result.url);
          }
        }
      }
      
      onSendMedia({
        content: caption || undefined,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        video_url: videoUrl,
      });
      
      setPendingFiles([]);
      setMediaCaption('');
    } catch (err) {
      console.error('Media upload error:', err);
      toast({
        title: 'შეცდომა',
        description: 'მედიის ატვირთვა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelMedia = () => {
    setPendingFiles([]);
    setMediaCaption('');
  };

  const handleGifSelect = (gif: { id: string; file_original: string; shortcode?: string | null }) => {
    // Always insert shortcode into message - never send immediately
    if (gif.shortcode) {
      // Shortcode already includes dots like .ბა9., don't add extra
      const shortcode = gif.shortcode.startsWith('.') ? gif.shortcode : `.${gif.shortcode}.`;
      setMessage(prev => prev + shortcode);
    } else {
      // Fallback: insert GIF URL directly if no shortcode
      setMessage(prev => prev + `[GIF:${gif.file_original}]`);
    }
    setShowGifPicker(false);
    textareaRef.current?.focus();
  };

  const sendQuickEmoji = () => {
    onSendMessage(customEmoji);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    // Don't close picker - allow adding multiple emojis
    textareaRef.current?.focus();
  };

  const handleVoiceButton = () => {
    // Check friend status for voice
    if (!canSendMedia) {
      toast({
        title: 'შეზღუდვა',
        description: 'ხმოვანი შეტყობინების გაგზავნა შესაძლებელია მხოლოდ მეგობრებს შორის.',
        variant: 'destructive',
      });
      return;
    }
    
    // Just start recording - overlay handles cancel/send
    if (!isRecording) {
      startRecording();
    }
  };

  // Show media restriction message
  const MediaRestrictionTooltip = ({ children }: { children: React.ReactNode }) => {
    if (canSendMedia) return <>{children}</>;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              {children}
              <div className="absolute inset-0 bg-background/50 rounded-full flex items-center justify-center">
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">მხოლოდ მეგობრებს შორის</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      {/* GIF Picker - fullscreen modal like group chats */}
      {showGifPicker && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* Media preview modal */}
      <MediaPreview
        files={pendingFiles}
        onRemove={handleRemoveFile}
        onSend={handleSendMedia}
        onCancel={handleCancelMedia}
        caption={mediaCaption}
        onCaptionChange={setMediaCaption}
        isUploading={isUploading}
        theme={theme}
      />

      <div className="border-t border-border bg-background p-2 sm:p-3 relative">
        {/* Friend-gated media warning banner */}
        {!canSendMedia && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>ფაილების გაგზავნა შესაძლებელია მხოლოდ მეგობრებს შორის.</span>
          </div>
        )}

        {/* Voice recording overlay */}
        <VoiceRecordingOverlay
          isRecording={isRecording}
          duration={recordingDuration}
          onCancel={cancelRecording}
          onStop={handleVoiceSend}
        />

        {/* Reply/Edit preview */}
        {(replyTo || editingMessage) && !isRecording && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">
                {editingMessage ? 'რედაქტირება' : `პასუხი: ${replyTo?.sender?.username}`}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {editingMessage?.content || replyTo?.content || '📷 მედია'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={editingMessage ? onCancelEdit : onCancelReply}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {!isRecording && (
          <div className="flex items-end gap-1 sm:gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e, 'image')}
              className="hidden"
              disabled={!canSendMedia}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleFileSelect(e, 'video')}
              className="hidden"
              disabled={!canSendMedia}
            />

            {/* Plus menu - always visible for file attachments */}
            {canSendMedia ? (
              <DropdownMenu open={showMoreOptions} onOpenChange={setShowMoreOptions}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-primary flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4 mr-2 text-green-500" />
                    ფოტო
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                    <Film className="w-4 h-4 mr-2 text-purple-500" />
                    ვიდეო
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2 text-blue-500" />
                    კამერა
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <MediaRestrictionTooltip>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-muted-foreground opacity-50 cursor-not-allowed flex-shrink-0"
                  disabled
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </MediaRestrictionTooltip>
            )}

            {/* Text input - takes most space */}
            <div className="flex-1 relative min-w-0">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Aa"
                disabled={disabled || isUploading}
                rows={1}
                className="min-h-[40px] max-h-[120px] py-2.5 px-3 resize-none rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary text-base"
              />
            </div>

            {/* Right side buttons - GIF, Emoji, Voice/Send - always visible */}
            <div className="flex items-center gap-0 flex-shrink-0">
              {/* GIF button - always visible */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGifPicker(true)}
                className="h-8 px-1.5 sm:h-9 sm:px-2 rounded-full font-bold text-primary text-[11px] sm:text-xs"
              >
                GIF
              </Button>

              {/* Emoji button - always visible */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-primary"
                >
                  <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 z-50">
                    <EmojiPicker
                      onSelect={handleEmojiSelect}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>

              {/* Voice / Send button */}
              {hasText || editingMessage ? (
                <Button
                  onClick={handleSend}
                  disabled={disabled || (!message.trim() && !editingMessage) || isUploading}
                  size="icon"
                  className={cn(
                    "h-8 w-8 sm:h-9 sm:w-9 rounded-full flex-shrink-0",
                    `bg-gradient-to-br ${themeColors.gradient} hover:opacity-90`
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </Button>
              ) : canSendMedia ? (
                <Button
                  onClick={handleVoiceButton}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-primary flex-shrink-0"
                  title="ხმოვანი შეტყობინება"
                >
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              ) : (
                <MediaRestrictionTooltip>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-muted-foreground opacity-50 cursor-not-allowed flex-shrink-0"
                    disabled
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                </MediaRestrictionTooltip>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
});

MessengerChatInput.displayName = 'MessengerChatInput';

export default MessengerChatInput;