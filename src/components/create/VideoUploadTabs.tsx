import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Link2, Video, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMuxUpload } from '@/hooks/useMuxUpload';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { extractVideoUrl } from '@/components/shared/VideoEmbed';
import VideoEmbed from '@/components/shared/VideoEmbed';
import { createPendingApproval } from '@/hooks/useModerationQueue';

interface VideoUploadTabsProps {
  onSuccess: (result: { type: 'upload' | 'url'; videoUrl?: string; embedUrl?: string }) => void;
  onCancel: () => void;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1GB for Mux

const ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/3gpp',
  'video/3gpp2',
  'video/ogg',
  'video/mpeg',
  'video/x-m4v',
];

const ALLOWED_EXTENSIONS = [
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', '3g2', 'ogv', 'ogg', 'mpeg', 'mpg', 'm4v'
];

const VideoUploadTabs = ({ onSuccess, onCancel }: VideoUploadTabsProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);

  const {
    isUploading,
    progress,
    status,
    createUpload,
    cancelUpload,
    reset,
  } = useMuxUpload();

  // Detect video URL from input
  useEffect(() => {
    if (urlInput.trim()) {
      const detected = extractVideoUrl(urlInput);
      setDetectedUrl(detected);
      if (urlInput.trim() && !detected) {
        setUrlError('ლინკი არ არის მხარდაჭერილი. სცადეთ YouTube, TikTok, Facebook, Vimeo, Instagram ან X/Twitter');
      } else {
        setUrlError(null);
      }
    } else {
      setDetectedUrl(null);
      setUrlError(null);
    }
  }, [urlInput]);

  const validateFile = useCallback((file: File): string | null => {
    const isValidType = ALLOWED_TYPES.includes(file.type);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    
    if (!isValidType && !isValidExtension) {
      return 'მხარდაუჭერელი ვიდეო ფორმატი. დაშვებულია: MP4, MOV, WEBM, AVI, MKV და სხვა';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'ფაილის ზომა არ უნდა აღემატებოდეს 1GB-ს';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setFile(selectedFile);
    
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setDuration(Math.floor(video.duration));
      URL.revokeObjectURL(url);
    };
    video.src = url;

    if (!title) {
      const name = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(name);
    }
  }, [validateFile, title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setFile(droppedFile);
      
      const url = URL.createObjectURL(droppedFile);
      setPreview(url);

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setDuration(Math.floor(video.duration));
      };
      video.src = url;

      if (!title) {
        const name = droppedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(name);
      }
    }
  }, [validateFile, title]);

  const handleUpload = async () => {
    if (!file || !user || !title.trim()) return;

    try {
      await createUpload(file, title.trim(), '');
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  // Handle URL submission
  const handleUrlSubmit = async () => {
    if (!detectedUrl || !user) return;

    setIsSubmittingUrl(true);
    try {
      // Create post with embedded video URL (pending moderation)
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: detectedUrl,
          is_approved: false, // Pending moderation
        })
        .select()
        .single();

      if (postError) throw postError;

      // Create pending approval for moderation
      if (postData) {
        await createPendingApproval({
          type: 'post_video',
          userId: user.id,
          contentId: postData.id,
          contentData: {
            content: detectedUrl,
            video_type: 'embed',
          },
        });
      }

      onSuccess({ type: 'url', embedUrl: detectedUrl });
    } catch (error) {
      console.error('Error creating post:', error);
      setUrlError('ვიდეოს გაზიარება ვერ მოხერხდა');
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  // When video is ready, create pending approval for moderation
  useEffect(() => {
    const createModerationRequest = async () => {
      if (status !== 'ready' || !user) return;

      try {
        // Create pending approval for moderation
        await createPendingApproval({
          type: 'post_video',
          userId: user.id,
          contentData: {
            title: title,
            video_type: 'mux_upload',
          },
        });
      } catch (error) {
        console.error('Error creating moderation request:', error);
      }

      setTimeout(() => {
        reset();
        onSuccess({ type: 'upload' });
      }, 1000);
    };

    if (status === 'ready') {
      createModerationRequest();
    }
  }, [status, user, reset, onSuccess]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />იტვირთება</Badge>;
      case 'processing':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3 animate-pulse" />მუშავდება</Badge>;
      case 'ready':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" />მზადაა</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />შეცდომა</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">ვიდეოს გაზიარება</h2>
          {getStatusBadge()}
        </div>
        <button
          onClick={() => {
            cancelUpload();
            onCancel();
          }}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
          disabled={isUploading && status === 'processing'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'url')} className="w-full">
        <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-border bg-transparent h-12">
          <TabsTrigger 
            value="upload" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Upload className="w-4 h-4 mr-2" />
            მოწყობილობიდან
          </TabsTrigger>
          <TabsTrigger 
            value="url"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Link2 className="w-4 h-4 mr-2" />
            ლინკით
          </TabsTrigger>
        </TabsList>

        {/* Upload from device */}
        <TabsContent value="upload" className="p-4 mt-0">
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-base font-medium mb-1">ჩააგდეთ ვიდეო აქ</p>
              <p className="text-sm text-muted-foreground mb-3">ან დააჭირეთ ასარჩევად</p>
              <p className="text-xs text-muted-foreground">MP4, WEBM, MOV, AVI • მაქსიმუმ 1GB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {file && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
                {preview && (
                  <video src={preview} className="w-full h-full object-contain" controls={false} />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Video className="w-10 h-10 text-white" />
                </div>
                {!isUploading && (
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setDuration(null);
                      reset();
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                <span className="truncate flex-1">{file.name}</span>
                <span>{formatSize(file.size)}</span>
                {duration && (
                  <span>{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
                )}
              </div>

              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ვიდეოს სათაური"
                maxLength={100}
                disabled={isUploading}
              />

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {status === 'uploading' && 'იტვირთება...'}
                      {status === 'processing' && 'მუშავდება...'}
                      {status === 'ready' && 'მზადაა!'}
                    </span>
                    <span>{progress}%</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    cancelUpload();
                    onCancel();
                  }}
                  disabled={isUploading && status === 'processing'}
                  className="flex-1"
                >
                  გაუქმება
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!title.trim() || isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {status === 'uploading' ? 'იტვირთება...' : 'მუშავდება...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      ატვირთვა
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Share by URL */}
        <TabsContent value="url" className="p-4 mt-0 space-y-4">
          <div className="space-y-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="ჩასვით ვიდეოს ლინკი (YouTube, TikTok, Facebook...)"
              className="text-sm"
            />
            {urlError && (
              <p className="text-xs text-destructive">{urlError}</p>
            )}
          </div>

          {detectedUrl && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden">
                <VideoEmbed url={detectedUrl} />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  disabled={isSubmittingUrl}
                >
                  გაუქმება
                </Button>
                <Button
                  onClick={handleUrlSubmit}
                  className="flex-1"
                  disabled={isSubmittingUrl}
                >
                  {isSubmittingUrl ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      იგზავნება...
                    </>
                  ) : (
                    'გაზიარება'
                  )}
                </Button>
              </div>
            </div>
          )}

          {!detectedUrl && (
            <div className="text-center py-6 text-muted-foreground">
              <Link2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">ჩასვით ლინკი და ვიდეოს გადახედვა გამოჩნდება</p>
              <p className="text-xs mt-2">მხარდაჭერილი: YouTube, TikTok, Facebook, Vimeo, Instagram, X/Twitter</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VideoUploadTabs;
