import { cn } from '@/lib/utils';
import ChatVideoMessage from '@/components/chat/ChatVideoMessage';
import VoiceMessagePlayer from '@/components/chat/VoiceMessagePlayer';
import { MessengerMessage } from '../types';

interface BubbleMediaContentProps {
  message: MessengerMessage;
  hasContent: boolean;
  onImageClick: (urls: string[], index: number) => void;
}

const BubbleMediaContent = ({ message, hasContent, onImageClick }: BubbleMediaContentProps) => {
  return (
    <>
      {/* Images */}
      {message.image_urls && message.image_urls.length > 0 && (
        <div className={cn(
          "grid gap-1",
          message.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2",
          hasContent && "mb-1"
        )}>
          {message.image_urls.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt=""
              className="w-full max-w-[240px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick(message.image_urls!, idx)}
            />
          ))}
        </div>
      )}

      {/* Video */}
      {message.video_url && (
        <div className={cn(hasContent && "mb-1")}>
          <ChatVideoMessage videoUrl={message.video_url} className="max-w-[240px]" />
        </div>
      )}

      {/* Voice */}
      {message.voice_url && (
        <div className={cn("min-w-[140px] max-w-[200px]", hasContent && "mb-1")}>
          <VoiceMessagePlayer
            audioUrl={message.voice_url}
            duration={message.voice_duration_seconds || undefined}
          />
        </div>
      )}

      {/* GIF */}
      {message.gif && (
        <div className={cn(hasContent && "mb-1")}>
          <img
            src={message.gif.url}
            alt="GIF"
            className="max-w-[80px] max-h-[80px] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
};

export default BubbleMediaContent;
