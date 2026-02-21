/**
 * Voice recording overlay for messenger
 */
import { memo } from 'react';
import { Mic, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecordingOverlayProps {
  isRecording: boolean;
  duration: number;
  onCancel: () => void;
  onStop: () => void;
  className?: string;
}

const VoiceRecordingOverlay = memo(({
  isRecording,
  duration,
  onCancel,
  onStop,
  className,
}: VoiceRecordingOverlayProps) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <div className={cn(
      "absolute inset-0 bg-background flex items-center gap-4 px-4 z-10",
      className
    )}>
      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onCancel}
        className="h-10 w-10 rounded-full text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-5 h-5" />
      </Button>

      {/* Recording indicator */}
      <div className="flex-1 flex items-center gap-3">
        <div className="relative">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-destructive rounded-full animate-ping opacity-75" />
        </div>
        
        <span className="text-sm font-medium text-foreground">
          {formatDuration(duration)}
        </span>

        {/* Waveform animation */}
        <div className="flex items-center gap-0.5 h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 80 + 20}%`,
                animationDelay: `${i * 50}ms`,
                animationDuration: '0.5s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Send button */}
      <Button
        onClick={onStop}
        size="icon"
        className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
  );
});

VoiceRecordingOverlay.displayName = 'VoiceRecordingOverlay';

export default VoiceRecordingOverlay;
