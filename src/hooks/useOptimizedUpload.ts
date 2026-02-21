import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { compressImage, validateFileSize, FILE_SIZE_LIMITS, validateVideoSize } from '@/utils/imageCompression';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

type ContentType = 'avatar' | 'chat-image' | 'chat-video' | 'story-image' | 'story-video' | 'post-image' | 'post-video' | 'voice' | 'reel';

interface UseOptimizedUploadOptions {
  contentType: ContentType;
  onProgress?: (progress: UploadProgress) => void;
}

// Content type to bucket and limit mapping
const CONTENT_CONFIG: Record<ContentType, { bucket: string; folder: string; sizeLimit: keyof typeof FILE_SIZE_LIMITS; compress: boolean }> = {
  'avatar': { bucket: 'chat-images', folder: 'avatars', sizeLimit: 'AVATAR', compress: true },
  'chat-image': { bucket: 'chat-images', folder: 'chat-images', sizeLimit: 'CHAT_IMAGE', compress: true },
  'chat-video': { bucket: 'chat-videos', folder: 'chat-videos', sizeLimit: 'CHAT_VIDEO', compress: false },
  'story-image': { bucket: 'stories', folder: 'stories', sizeLimit: 'STORY_IMAGE', compress: true },
  'story-video': { bucket: 'stories', folder: 'stories', sizeLimit: 'STORY_VIDEO', compress: false },
  'post-image': { bucket: 'posts', folder: 'posts', sizeLimit: 'POST_IMAGE', compress: true },
  'post-video': { bucket: 'videos', folder: 'posts', sizeLimit: 'POST_VIDEO', compress: false },
  'voice': { bucket: 'music', folder: 'voice-messages', sizeLimit: 'VOICE_MESSAGE', compress: false },
  'reel': { bucket: 'reels', folder: 'reels', sizeLimit: 'REEL_VIDEO', compress: false },
};

/**
 * Optimized upload hook with automatic compression and size validation
 * Designed to minimize storage costs
 */
export function useOptimizedUpload(options: UseOptimizedUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const config = CONTENT_CONFIG[options.contentType];

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      let processedFile = file;

      // Compress images if configured
      if (config.compress && file.type.startsWith('image/')) {
        setProgress({ loaded: 0, total: file.size, percentage: 5 });
        processedFile = await compressImage(file, {
          maxWidth: options.contentType === 'avatar' ? 400 : 1920,
          maxHeight: options.contentType === 'avatar' ? 400 : 1920,
          quality: options.contentType === 'avatar' ? 0.85 : 0.8,
          maxSizeKB: options.contentType === 'avatar' ? 200 : 500
        });
      }

      // Validate file size
      const sizeValidation = validateFileSize(processedFile, config.sizeLimit);
      if (!sizeValidation.valid) {
        throw new Error(sizeValidation.message);
      }

      // Additional video validation
      if (file.type.startsWith('video/')) {
        const videoValidation = await validateVideoSize(file, FILE_SIZE_LIMITS[config.sizeLimit] / (1024 * 1024));
        if (!videoValidation.valid) {
          throw new Error(videoValidation.message);
        }
      }

      setProgress({ loaded: 0, total: processedFile.size, percentage: 20 });

      // Generate unique filename
      const fileExt = processedFile.name.split('.').pop()?.toLowerCase() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${config.folder}/${fileName}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev || prev.percentage >= 90) return prev;
          const newPercentage = prev.percentage + 10;
          const progressData = {
            loaded: Math.floor((newPercentage / 100) * processedFile.size),
            total: processedFile.size,
            percentage: newPercentage
          };
          options.onProgress?.(progressData);
          return progressData;
        });
      }, 200);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(config.bucket)
        .upload(filePath, processedFile, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: processedFile.type
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(config.bucket)
        .getPublicUrl(data.path);

      setProgress({ loaded: processedFile.size, total: processedFile.size, percentage: 100 });
      
      return {
        url: urlData.publicUrl,
        key: data.path,
        size: processedFile.size,
        contentType: processedFile.type
      };
    } catch (err: any) {
      const errorMessage = err.message || 'ატვირთვა ვერ მოხერხდა';
      setError(errorMessage);
      console.error('Optimized upload error:', err);
      toast({
        title: 'ატვირთვა ვერ მოხერხდა',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [config, options, toast]);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
    maxSizeBytes: FILE_SIZE_LIMITS[config.sizeLimit]
  };
}
