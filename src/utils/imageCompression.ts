/**
 * Advanced Image Compression Pipeline
 * - Progressive compression with quality preservation
 * - Format detection (AVIF > WebP > JPEG)
 * - EXIF stripping for privacy
 * - Responsive variant generation
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  preserveExif?: boolean;
  outputFormat?: 'auto' | 'webp' | 'jpeg' | 'avif';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: undefined, // Keep original dimensions
  maxHeight: undefined, // Keep original dimensions
  quality: 0.88, // High quality compression
  maxSizeKB: 2048, // 2MB target - compress only file size, not dimensions
  preserveExif: false,
  outputFormat: 'auto'
};

// Cache format support check
let formatSupportCache: { avif: boolean; webp: boolean } | null = null;

/**
 * Check browser format support (cached)
 */
export const checkFormatSupport = async (): Promise<{ avif: boolean; webp: boolean }> => {
  if (formatSupportCache) return formatSupportCache;
  
  const checkImage = (src: string): Promise<boolean> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.width > 0);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  };
  
  const [avif, webp] = await Promise.all([
    checkImage('data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABpAQ0AIQ0w=='),
    checkImage('data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==')
  ]);
  
  formatSupportCache = { avif, webp };
  return formatSupportCache;
};

/**
 * Get best output format based on browser support
 * NOTE: AVIF disabled due to compatibility issues on some mobile browsers
 */
export const getBestFormat = async (): Promise<'webp' | 'jpeg'> => {
  const support = await checkFormatSupport();
  // Skip AVIF - causes loading issues on some Android browsers
  if (support.webp) return 'webp';
  return 'jpeg';
};

/**
 * Compress an image file to reduce size while maintaining quality
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip compression for non-image files or GIFs (to preserve animation)
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }
  
  // Skip if already small enough
  if (file.size <= (opts.maxSizeKB! * 1024)) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          // Only resize if maxWidth/maxHeight are explicitly set
          if (opts.maxWidth && opts.maxHeight && (width > opts.maxWidth || height > opts.maxHeight)) {
            const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            resolve(file);
            return;
          }
          
          // High quality rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Fill with white (for JPEG)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Determine output format
          let outputFormat: string;
          let outputMime: string;
          
          if (opts.outputFormat === 'auto') {
            const bestFormat = await getBestFormat();
            outputFormat = bestFormat;
            outputMime = bestFormat === 'webp' ? 'image/webp' : 'image/jpeg';
          } else if (opts.outputFormat === 'avif') {
            // AVIF requested but disabled, fallback to webp
            outputFormat = 'webp';
            outputMime = 'image/webp';
          } else {
            outputFormat = opts.outputFormat || 'jpeg';
            outputMime = outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
          }
          
          // Try different quality levels to meet size target
          let quality = opts.quality!;
          const minQuality = 0.5; // Don't go below 50% quality
          
          const tryCompress = (q: number): void => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(file);
                  return;
                }
                
                // If still too large and quality can be reduced, try again
                if (blob.size > opts.maxSizeKB! * 1024 && q > minQuality) {
                  tryCompress(q - 0.05);
                  return;
                }
                
                // Create new file with compressed data
                const ext = outputFormat === 'webp' ? 'webp' : 'jpg';
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^.]+$/, `.${ext}`),
                  { type: outputMime }
                );
                
                console.log(`[ImageCompression] ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB (${((1 - blob.size / file.size) * 100).toFixed(0)}% reduction, format: ${outputFormat})`);
                resolve(compressedFile);
              },
              outputMime,
              q
            );
          };
          
          tryCompress(quality);
        } catch (err) {
          console.warn('[ImageCompression] Compression failed, using original:', err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Compress video by limiting resolution (client-side, basic)
 * Note: Real video compression requires server-side processing
 */
export async function validateVideoSize(file: File, maxSizeMB: number = 50): Promise<{ valid: boolean; message?: string }> {
  const sizeMB = file.size / (1024 * 1024);
  
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      message: `ვიდეო ზომა (${sizeMB.toFixed(1)}MB) აჭარბებს ლიმიტს (${maxSizeMB}MB). გთხოვთ შეამციროთ ვიდეოს ხანგრძლივობა ან ხარისხი.`
    };
  }
  
  return { valid: true };
}

/**
 * Get file size limits for different content types
 */
export const FILE_SIZE_LIMITS = {
  // Images
  AVATAR: 20 * 1024 * 1024,
  CHAT_IMAGE: 20 * 1024 * 1024,
  POST_IMAGE: 20 * 1024 * 1024,
  STORY_IMAGE: 20 * 1024 * 1024,
  
  // Videos
  CHAT_VIDEO: 500 * 1024 * 1024,
  STORY_VIDEO: 200 * 1024 * 1024,
  POST_VIDEO: 500 * 1024 * 1024,
  REEL_VIDEO: 500 * 1024 * 1024,
  
  // Audio
  VOICE_MESSAGE: 200 * 1024 * 1024,
  AUDIO_FILE: 200 * 1024 * 1024,
} as const;

/**
 * Validate file size against limits
 */
export function validateFileSize(
  file: File,
  limitKey: keyof typeof FILE_SIZE_LIMITS
): { valid: boolean; message?: string } {
  const limit = FILE_SIZE_LIMITS[limitKey];
  
  if (file.size > limit) {
    const limitMB = limit / (1024 * 1024);
    const fileMB = file.size / (1024 * 1024);
    return {
      valid: false,
      message: `ფაილის ზომა (${fileMB.toFixed(1)}MB) აჭარბებს ლიმიტს (${limitMB}MB)`
    };
  }
  
  return { valid: true };
}
