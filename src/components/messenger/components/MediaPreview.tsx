/**
 * Media preview before sending in messenger
 */
import { memo } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ChatTheme, CHAT_THEME_COLORS } from '../types';

interface MediaPreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  onSend: (caption: string) => void;
  onCancel: () => void;
  caption: string;
  onCaptionChange: (value: string) => void;
  isUploading: boolean;
  theme: ChatTheme;
}

const MediaPreview = memo(({
  files,
  onRemove,
  onSend,
  onCancel,
  caption,
  onCaptionChange,
  isUploading,
  theme,
}: MediaPreviewProps) => {
  const themeColors = CHAT_THEME_COLORS[theme];

  if (files.length === 0) return null;

  const handleSend = () => {
    onSend(caption);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          disabled={isUploading}
        >
          <X className="w-5 h-5" />
        </Button>
        <span className="font-medium">
          {files.length} {files.length === 1 ? 'ფაილი' : 'ფაილი'}
        </span>
        <div className="w-10" />
      </div>

      {/* Media grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className={cn(
          "grid gap-2 max-w-2xl mx-auto",
          files.length === 1 ? "grid-cols-1" : "grid-cols-2"
        )}>
          {files.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            const url = URL.createObjectURL(file);

            return (
              <div key={index} className="relative group">
                {isImage && (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-auto max-h-[60vh] object-contain rounded-xl"
                    onLoad={() => URL.revokeObjectURL(url)}
                  />
                )}
                {isVideo && (
                  <video
                    src={url}
                    className="w-full h-auto max-h-[60vh] rounded-xl"
                    controls
                    onLoadedData={() => URL.revokeObjectURL(url)}
                  />
                )}
                
                {/* Remove button */}
                <button
                  onClick={() => onRemove(index)}
                  disabled={isUploading}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caption and send */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <Textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="დაამატე ტექსტი..."
            disabled={isUploading}
            rows={1}
            className="flex-1 min-h-[44px] max-h-[100px] resize-none rounded-xl"
          />
          <Button
            onClick={handleSend}
            disabled={isUploading}
            className={cn(
              "h-11 px-6 rounded-full",
              `bg-gradient-to-br ${themeColors.gradient} hover:opacity-90`
            )}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                გაგზავნა
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

MediaPreview.displayName = 'MediaPreview';

export default MediaPreview;
