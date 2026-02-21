import { useState, useRef, useCallback, forwardRef } from 'react';
import { Mic, MicOff, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useS3Upload, S3_FOLDERS } from '@/hooks/useS3Upload';

interface VoiceRecorderProps {
  userId: string;
  onVoiceSend: (audioUrl: string) => void;
  disabled?: boolean;
}

const VoiceRecorder = forwardRef<HTMLDivElement, VoiceRecorderProps>(({ userId, onVoiceSend, disabled }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { upload: s3Upload } = useS3Upload({ folder: S3_FOLDERS.VOICE });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'შეცდომა',
        description: 'მიკროფონის წვდომა ვერ მოხერხდა',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const uploadAndSend = useCallback(async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      // Convert blob to File for S3 upload
      const file = new File([audioBlob], `${Date.now()}.webm`, { type: 'audio/webm' });
      
      const result = await s3Upload(file, S3_FOLDERS.VOICE);
      
      if (!result) throw new Error('Upload failed');

      onVoiceSend(result.url);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);

    } catch (error) {
      console.error('Error uploading voice:', error);
      toast({
        title: 'შეცდომა',
        description: 'ხმოვანი შეტყობინების გაგზავნა ვერ მოხერხდა',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, s3Upload, onVoiceSend, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioUrl && audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-3 py-1">
        <audio src={audioUrl} controls className="h-8 max-w-[120px]" />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={cancelRecording}
          disabled={isUploading}
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className="h-7 w-7 bg-primary"
          onClick={uploadAndSend}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 rounded-full px-3 py-1">
        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
        <span className="text-xs text-destructive font-medium min-w-[40px]">
          {formatTime(recordingTime)}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive"
          onClick={cancelRecording}
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className="h-7 w-7 bg-destructive"
          onClick={stopRecording}
        >
          <MicOff className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8"
      onClick={startRecording}
      disabled={disabled}
    >
      <Mic className="w-4 h-4" />
    </Button>
  );
});

VoiceRecorder.displayName = 'VoiceRecorder';

export default VoiceRecorder;
