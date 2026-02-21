/**
 * Optimized Upload Pipeline
 * - Network-aware uploads
 * - Progressive compression
 * - Retry with exponential backoff
 * - Queue management for multiple uploads
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { compressImage, validateFileSize, FILE_SIZE_LIMITS, validateVideoSize, getBestFormat } from '@/utils/imageCompression';
import { isGoodConnection, shouldReduceData } from '@/lib/networkOptimizer';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'compressing' | 'uploading' | 'processing' | 'complete' | 'error';
}

interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
  compressionRatio?: number;
}

type ContentType = 'avatar' | 'chat-image' | 'chat-video' | 'story-image' | 'story-video' | 'post-image' | 'post-video' | 'voice' | 'reel';

interface UseOptimizedUploadOptions {
  contentType: ContentType;
  onProgress?: (progress: UploadProgress) => void;
  enableCompression?: boolean;
  maxRetries?: number;
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

// Upload queue for managing concurrent uploads
const uploadQueue: Array<{
  id: string;
  priority: number;
  execute: () => Promise<UploadResult | null>;
}> = [];
let activeUploads = 0;
const MAX_CONCURRENT_UPLOADS = 2;

/**
 * Optimized upload hook with compression, retry, and network awareness
 */
export function useOptimizedUploadV2(options: UseOptimizedUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const { contentType, onProgress, enableCompression = true, maxRetries = 2 } = options;
  const config = CONTENT_CONFIG[contentType];

  // Update progress and notify callback
  const updateProgress = useCallback((update: Partial<UploadProgress>) => {
    setProgress(prev => {
      const newProgress = { ...prev, ...update } as UploadProgress;
      onProgress?.(newProgress);
      return newProgress;
    });
  }, [onProgress]);

  // Compress file with network awareness
  const compressFile = useCallback(async (file: File): Promise<File> => {
    if (!config.compress || !enableCompression || !file.type.startsWith('image/')) {
      return file;
    }

    updateProgress({ stage: 'compressing', percentage: 10 });

    // Adjust compression based on network
    const reduceQuality = shouldReduceData();
    const quality = reduceQuality ? 0.7 : 0.85;
    const maxSize = reduceQuality ? 400 : 800;

    try {
      const compressed = await compressImage(file, {
        maxWidth: contentType === 'avatar' ? 400 : 1920,
        maxHeight: contentType === 'avatar' ? 400 : 1920,
        quality,
        maxSizeKB: contentType === 'avatar' ? 200 : maxSize
      });

      const ratio = file.size > 0 ? ((1 - compressed.size / file.size) * 100).toFixed(0) : '0';
      console.log(`[OptimizedUpload] Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressed.size / 1024).toFixed(1)}KB (${ratio}% reduction)`);
      
      return compressed;
    } catch (err) {
      console.warn('[OptimizedUpload] Compression failed, using original:', err);
      return file;
    }
  }, [config.compress, enableCompression, contentType, updateProgress]);

  // Upload with retry
  const uploadWithRetry = useCallback(async (
    file: File,
    filePath: string,
    attempt: number = 0
  ): Promise<{ data: any; error: any }> => {
    try {
      abortControllerRef.current = new AbortController();
      
      const result = await supabase.storage
        .from(config.bucket)
        .upload(filePath, file, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: file.type
        });

      return result;
    } catch (err: any) {
      // Check if it's a network error and we should retry
      if (attempt < maxRetries && !abortControllerRef.current?.signal.aborted) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`[OptimizedUpload] Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        return uploadWithRetry(file, filePath, attempt + 1);
      }
      return { data: null, error: err };
    }
  }, [config.bucket, maxRetries]);

  // Main upload function
  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);
    updateProgress({ loaded: 0, total: file.size, percentage: 0, stage: 'compressing' });

    try {
      // Step 1: Compress
      const processedFile = await compressFile(file);
      const compressionRatio = file.size > 0 ? (1 - processedFile.size / file.size) * 100 : 0;

      // Step 2: Validate size
      const sizeValidation = validateFileSize(processedFile, config.sizeLimit);
      if (!sizeValidation.valid) {
        throw new Error(sizeValidation.message);
      }

      // Step 3: Additional video validation
      if (file.type.startsWith('video/')) {
        const videoValidation = await validateVideoSize(file, FILE_SIZE_LIMITS[config.sizeLimit] / (1024 * 1024));
        if (!videoValidation.valid) {
          throw new Error(videoValidation.message);
        }
      }

      updateProgress({ stage: 'uploading', percentage: 30 });

      // Step 4: Generate filename
      const fileExt = processedFile.name.split('.').pop()?.toLowerCase() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${config.folder}/${fileName}`;

      // Step 5: Simulate progress during upload
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev || prev.percentage >= 85) return prev;
          const newPct = Math.min(prev.percentage + 8, 85);
          return { ...prev, percentage: newPct };
        });
      }, 300);

      // Step 6: Upload with retry
      const { data, error: uploadError } = await uploadWithRetry(processedFile, filePath);

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      updateProgress({ stage: 'processing', percentage: 90 });

      // Step 7: Get public URL
      const { data: urlData } = supabase.storage
        .from(config.bucket)
        .getPublicUrl(data.path);

      updateProgress({ stage: 'complete', percentage: 100 });

      const result: UploadResult = {
        url: urlData.publicUrl,
        key: data.path,
        size: processedFile.size,
        contentType: processedFile.type,
        compressionRatio: Math.round(compressionRatio)
      };

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'ატვირთვა ვერ მოხერხდა';
      setError(errorMessage);
      updateProgress({ stage: 'error', percentage: 0 });
      console.error('[OptimizedUpload] Error:', err);
      toast({
        title: 'ატვირთვა ვერ მოხერხდა',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  }, [config, compressFile, uploadWithRetry, updateProgress, toast]);

  // Cancel upload
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  // Reset state
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
    cancel,
    reset,
    maxSizeBytes: FILE_SIZE_LIMITS[config.sizeLimit],
    isNetworkGood: isGoodConnection()
  };
}

// Re-export with better name
export { useOptimizedUploadV2 as useAdvancedUpload };
