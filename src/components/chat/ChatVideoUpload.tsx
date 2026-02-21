import { useState, useRef, useCallback } from 'react';
import { Video, X, Upload, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useS3Upload, S3_FOLDERS } from '@/hooks/useS3Upload';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
// Support all common video formats
const ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // MOV
  'video/x-msvideo', // AVI
  'video/x-matroska', // MKV
  'video/x-ms-wmv', // WMV
  'video/x-flv', // FLV
  'video/3gpp', // 3GP
  'video/3gpp2', // 3G2
  'video/ogg', // OGG
  'video/mpeg', // MPEG
  'video/x-m4v', // M4V
];

// File extensions for validation fallback (some browsers don't set correct MIME types)
const ALLOWED_EXTENSIONS = [
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', '3g2', 'ogv', 'ogg', 'mpeg', 'mpg', 'm4v'
];

interface ChatVideoUploadProps {
  userId: string;
  onUploadComplete: (videoUrl: string, duration?: number) => void;
  onCancel: () => void;
}

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'processing' | 'complete' | 'failed';

const ChatVideoUpload = ({ userId, onUploadComplete, onCancel }: ChatVideoUploadProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { upload: s3Upload, progress: uploadProgress } = useS3Upload({ folder: S3_FOLDERS.CHAT_VIDEOS });

  const validateFile = (selectedFile: File): string | null => {
    // Check MIME type first
    const isValidType = ALLOWED_TYPES.includes(selectedFile.type);
    
    // Fallback: check file extension if MIME type check fails
    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    
    if (!isValidType && !isValidExtension) {
      return 'მხარდაუჭერელი ვიდეო ფორმატი. დაშვებულია: MP4, WEBM, MOV, AVI, MKV, WMV, FLV, 3GP და სხვა';
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      return 'ვიდეოს ზომა არ უნდა აღემატებოდეს 500MB-ს';
    }
    return null;
  };

  const extractVideoDuration = (videoFile: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(Math.floor(video.duration));
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setStatus('validating');

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setStatus('failed');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    
    // Extract duration
    const videoDuration = await extractVideoDuration(selectedFile);
    setDuration(videoDuration);
    setStatus('idle');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const uploadVideo = async () => {
    if (!file || !userId) {
      console.error('Missing file or userId:', { file: !!file, userId });
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      console.log('Starting video upload:', { fileName: file.name, size: file.size, type: file.type });
      
      // Use S3 upload
      const result = await s3Upload(file, S3_FOLDERS.CHAT_VIDEOS);
      
      console.log('Upload result:', result);
      
      if (!result) {
        throw new Error('ატვირთვა ვერ მოხერხდა - სცადეთ თავიდან');
      }

      setProgress(100);
      setStatus('complete');

      toast({
        title: 'ვიდეო აიტვირთა',
        description: 'ვიდეო წარმატებით გაიგზავნა'
      });

      onUploadComplete(result.url, duration || undefined);
      setIsOpen(false);
    } catch (err: any) {
      console.error('Video upload error:', err);
      setError(err.message || 'ატვირთვა ვერ მოხერხდა. შეამოწმეთ ინტერნეტ კავშირი.');
      setStatus('failed');
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus('idle');
    setProgress(0);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setIsOpen(false);
    onCancel();
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            ვიდეოს გაგზავნა
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone / File Select */}
          {!file && status !== 'failed' && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleInputChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-foreground font-medium mb-2">
                აირჩიეთ ან ჩააგდეთ ვიდეო
              </p>
              <p className="text-sm text-muted-foreground">
                ყველა ფორმატი • მაქსიმუმ 500MB
              </p>
            </div>
          )}

          {/* Error State */}
          {status === 'failed' && error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
              <p className="text-destructive font-medium mb-3">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  გაუქმება
                </Button>
                <Button size="sm" onClick={handleRetry} className="gap-1">
                  <RotateCcw className="w-4 h-4" />
                  თავიდან
                </Button>
              </div>
            </div>
          )}

          {/* File Preview */}
          {file && previewUrl && status !== 'failed' && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  src={previewUrl}
                  className="w-full h-full object-contain"
                  controls={status === 'idle'}
                />
                {status !== 'idle' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="truncate max-w-[200px]">{file.name}</span>
                <div className="flex items-center gap-3">
                  <span>{formatSize(file.size)}</span>
                  {duration && <span>{formatDuration(duration)}</span>}
                </div>
              </div>

              {/* Progress Bar */}
              {(status === 'uploading' || status === 'processing') && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    {status === 'uploading' ? 'იტვირთება...' : 'მზადდება...'}
                    {' '}{Math.round(progress)}%
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {status === 'idle' && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setDuration(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    გაუქმება
                  </Button>
                  <Button 
                    className="flex-1 gap-1"
                    onClick={uploadVideo}
                  >
                    <Video className="w-4 h-4" />
                    გაგზავნა
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatVideoUpload;
