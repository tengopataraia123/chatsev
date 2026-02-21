/**
 * Advanced Image Optimizer
 * - Responsive image variants generation
 * - AVIF/WebP with JPEG fallback
 * - Quality-aware compression (visually lossless)
 * - EXIF stripping for privacy
 */

export interface ImageVariant {
  blob: Blob;
  width: number;
  height: number;
  format: string;
}

export interface OptimizedImageResult {
  original: Blob;
  variants: {
    thumbnail: ImageVariant;  // ~200px
    small: ImageVariant;      // ~640px
    medium: ImageVariant;     // ~1080px
    large: ImageVariant;      // ~1920px
  };
  metadata: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    format: string;
  };
}

// Size presets
const SIZE_PRESETS = {
  thumbnail: { maxWidth: 200, maxHeight: 200, quality: 0.75 },
  small: { maxWidth: 640, maxHeight: 640, quality: 0.80 },
  medium: { maxWidth: 1080, maxHeight: 1080, quality: 0.85 },
  large: { maxWidth: 1920, maxHeight: 1920, quality: 0.88 },
} as const;

// Check format support
export const checkFormatSupport = async (): Promise<{avif: boolean, webp: boolean}> => {
  const checkImage = (src: string): Promise<boolean> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.width > 0 && img.height > 0);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  };
  
  // Cached result
  const cached = sessionStorage.getItem('image_format_support');
  if (cached) return JSON.parse(cached);
  
  const [avif, webp] = await Promise.all([
    checkImage('data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABpAQ0AIQ0w=='),
    checkImage('data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==')
  ]);
  
  const result = { avif, webp };
  sessionStorage.setItem('image_format_support', JSON.stringify(result));
  return result;
};

// Get best supported format
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

// Load image from file
const loadImage = (file: File | Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
};

// Calculate dimensions maintaining aspect ratio
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio)
  };
};

// Compress image to specific size/format
const compressToVariant = async (
  img: HTMLImageElement,
  preset: { maxWidth: number; maxHeight: number; quality: number },
  format: 'avif' | 'webp' | 'jpeg'
): Promise<ImageVariant> => {
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    preset.maxWidth,
    preset.maxHeight
  );
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas context not available');
  
  // High quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Fill with white for JPEG (no transparency)
  if (format === 'jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
  
  ctx.drawImage(img, 0, 0, width, height);
  
  // Get mime type
  const mimeTypes = {
    avif: 'image/avif',
    webp: 'image/webp',
    jpeg: 'image/jpeg'
  };
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Failed to compress to ${format}`));
          return;
        }
        resolve({
          blob,
          width,
          height,
          format
        });
      },
      mimeTypes[format],
      preset.quality
    );
  });
};

// Main optimization function
export const optimizeImage = async (
  file: File,
  options: {
    generateVariants?: boolean;
    stripExif?: boolean;
    maxOriginalSize?: number;
  } = {}
): Promise<OptimizedImageResult> => {
  const {
    generateVariants = true,
    stripExif = true,
    maxOriginalSize = 1920
  } = options;
  
  // Skip non-images and GIFs (preserve animation)
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    throw new Error('Invalid file type');
  }
  
  const img = await loadImage(file);
  const format = await getBestFormat();
  
  // Generate variants
  const variants: Record<string, ImageVariant> = {};
  
  if (generateVariants) {
    const variantPromises = Object.entries(SIZE_PRESETS).map(async ([key, preset]) => {
      try {
        const variant = await compressToVariant(img, preset, format);
        return [key, variant] as [string, ImageVariant];
      } catch {
        // Fallback to JPEG
        const variant = await compressToVariant(img, preset, 'jpeg');
        return [key, variant] as [string, ImageVariant];
      }
    });
    
    const results = await Promise.all(variantPromises);
    results.forEach(([key, variant]) => {
      variants[key] = variant;
    });
  }
  
  // Optimize original (but not larger than maxOriginalSize)
  const originalPreset = {
    maxWidth: maxOriginalSize,
    maxHeight: maxOriginalSize,
    quality: 0.90
  };
  
  let optimizedOriginal: Blob;
  try {
    const variant = await compressToVariant(img, originalPreset, format);
    optimizedOriginal = variant.blob;
  } catch {
    const variant = await compressToVariant(img, originalPreset, 'jpeg');
    optimizedOriginal = variant.blob;
  }
  
  const compressionRatio = file.size > 0 ? (1 - optimizedOriginal.size / file.size) * 100 : 0;
  
  console.log(`[ImageOptimizer] Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(optimizedOriginal.size / 1024).toFixed(1)}KB (${compressionRatio.toFixed(0)}% reduction)`);
  
  return {
    original: optimizedOriginal,
    variants: variants as OptimizedImageResult['variants'],
    metadata: {
      originalSize: file.size,
      optimizedSize: optimizedOriginal.size,
      compressionRatio,
      format
    }
  };
};

// Quick compress for uploads (single variant, fast)
export const quickCompress = async (
  file: File,
  maxSize: number = 1920,
  quality: number = 0.85
): Promise<File> => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }
  
  // Skip small files
  if (file.size < 100 * 1024) { // 100KB
    return file;
  }
  
  try {
    const img = await loadImage(file);
    const format = await getBestFormat();
    
    const variant = await compressToVariant(img, {
      maxWidth: maxSize,
      maxHeight: maxSize,
      quality
    }, format);
    
    // If compression didn't help, return original
    if (variant.blob.size >= file.size * 0.9) {
      return file;
    }
    
    const ext = format === 'webp' ? 'webp' : 'jpg';
    const newName = file.name.replace(/\.[^.]+$/, `.${ext}`);
    
    return new File([variant.blob], newName, { type: variant.blob.type });
  } catch (error) {
    console.warn('[ImageOptimizer] Quick compress failed:', error);
    return file;
  }
};

// Generate srcset string for responsive images
export const generateSrcSet = (urls: {
  small?: string;
  medium?: string;
  large?: string;
}): string => {
  const parts: string[] = [];
  
  if (urls.small) parts.push(`${urls.small} 640w`);
  if (urls.medium) parts.push(`${urls.medium} 1080w`);
  if (urls.large) parts.push(`${urls.large} 1920w`);
  
  return parts.join(', ');
};
