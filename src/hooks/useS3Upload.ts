import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/utils/imageCompression';

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

interface UseS3UploadOptions {
  folder?: string;
  onProgress?: (progress: UploadProgress) => void;
  skipCompression?: boolean;
}

// Supabase Storage implementation with automatic image compression
export function useS3Upload(options: UseS3UploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const upload = useCallback(async (file: File, customFolder?: string): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      let processedFile = file;
      const folder = customFolder || options.folder || 'uploads';
      
      // Compress images automatically (unless skipped)
      if (!options.skipCompression && file.type.startsWith('image/') && file.type !== 'image/gif') {
        const isAvatar = folder === 'avatars';
        
        processedFile = await compressImage(file, {
          maxWidth: isAvatar ? 400 : 1920,
          maxHeight: isAvatar ? 400 : 1920,
          quality: isAvatar ? 0.85 : 0.8,
          maxSizeKB: isAvatar ? 200 : 500
        });
      }

      const fileExt = processedFile.name.split('.').pop()?.toLowerCase() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Map folder names to bucket names
      const folderToBucket: Record<string, string> = {
        'stories': 'stories',
        'photos': 'media',
        'posts': 'posts',
        'avatars': 'chat-images',
        'covers': 'chat-images',
        'videos': 'videos',
        'chat-images': 'chat-images',
        'chat-videos': 'chat-videos',
        'reels': 'reels',
        'music': 'music',
        'audio': 'music',
        'voice-messages': 'music',
        'gifs': 'gifs',
        'dating': 'media',
        'group-files': 'media',
        'uploads': 'media',
      };

      // Determine bucket based on file type if not in mapping
      const getDefaultBucket = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) return 'chat-images';
        if (mimeType.startsWith('video/')) return 'videos';
        if (mimeType.startsWith('audio/')) return 'music';
        return 'media';
      };

      // Get bucket from folder mapping or determine from file type
      const bucket = folderToBucket[folder] || getDefaultBucket(processedFile.type);
      const filePath = `${folder}/${fileName}`;

      // Simulate progress (Supabase doesn't provide real progress)
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
        .from(bucket)
        .upload(filePath, processedFile, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: processedFile.type
        });

      clearInterval(progressInterval);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress({ loaded: processedFile.size, total: processedFile.size, percentage: 100 });
      
      console.log(`File uploaded: ${(file.size / 1024).toFixed(1)}KB -> ${(processedFile.size / 1024).toFixed(1)}KB`);
      
      return {
        url: urlData.publicUrl,
        key: data.path,
        size: processedFile.size,
        contentType: processedFile.type
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      console.error('Upload error:', err);
      toast({
        title: 'ატვირთვა ვერ მოხერხდა',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [options, toast]);

  const uploadMultiple = useCallback(async (files: File[], customFolder?: string): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await upload(file, customFolder);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }, [upload]);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    upload,
    uploadMultiple,
    uploading,
    progress,
    error,
    reset
  };
}

// Folder constants for different media types (kept for compatibility)
export const S3_FOLDERS = {
  PHOTOS: 'photos',
  VIDEOS: 'videos',
  AUDIO: 'audio',
  VOICE: 'voice-messages',
  CHAT_IMAGES: 'chat-images',
  CHAT_VIDEOS: 'chat-videos',
  STORIES: 'stories',
  REELS: 'reels',
  MUSIC: 'music',
  POSTS: 'posts',
  AVATARS: 'avatars',
  COVERS: 'covers',
  GROUP_FILES: 'group-files',
  DATING: 'dating',
  GIFS: 'gifs'
} as const;

export type S3Folder = typeof S3_FOLDERS[keyof typeof S3_FOLDERS];
