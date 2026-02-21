/**
 * ULTRA AVATAR SYSTEM - Media Utilities
 * File validation, compression, and format handling
 */

import { 
  SUPPORTED_IMAGE_FORMATS, 
  SUPPORTED_VIDEO_FORMATS, 
  ANIMATED_IMAGE_FORMATS,
  AVATAR_LIMITS,
  AvatarMedia,
} from '@/components/avatar/types';

/**
 * Validate file type and extension
 */
export function validateAvatarFile(file: File): { valid: boolean; message?: string; type?: AvatarMedia['type'] } {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type.toLowerCase();
  
  // Check for malicious files
  if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
    return { valid: false, message: 'არასწორი ფაილის ტიპი' };
  }
  
  // Check image formats
  if (mimeType.startsWith('image/')) {
    if (!SUPPORTED_IMAGE_FORMATS.includes(extension)) {
      return { 
        valid: false, 
        message: `მხარდაჭერილი ფორმატები: ${SUPPORTED_IMAGE_FORMATS.join(', ')}` 
      };
    }
    
    // Check if animated
    const isAnimated = ANIMATED_IMAGE_FORMATS.includes(extension);
    
    // Size check
    if (file.size > AVATAR_LIMITS.maxImageSize) {
      return { 
        valid: false, 
        message: `მაქსიმალური ზომა: ${AVATAR_LIMITS.maxImageSize / 1024 / 1024}MB` 
      };
    }
    
    return { 
      valid: true, 
      type: isAnimated ? 'animated-image' : 'image' 
    };
  }
  
  // Check video formats
  if (mimeType.startsWith('video/')) {
    if (!SUPPORTED_VIDEO_FORMATS.includes(extension)) {
      return { 
        valid: false, 
        message: `მხარდაჭერილი ვიდეო ფორმატები: ${SUPPORTED_VIDEO_FORMATS.join(', ')}` 
      };
    }
    
    if (file.size > AVATAR_LIMITS.maxVideoSize) {
      return { 
        valid: false, 
        message: `მაქსიმალური ვიდეო ზომა: ${AVATAR_LIMITS.maxVideoSize / 1024 / 1024}MB` 
      };
    }
    
    return { valid: true, type: 'video' };
  }
  
  return { valid: false, message: 'არასწორი ფაილი' };
}

/**
 * Validate video duration
 */
export async function validateVideoDuration(file: File): Promise<{ valid: boolean; duration?: number; message?: string }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      
      if (video.duration > AVATAR_LIMITS.maxVideoDuration) {
        resolve({ 
          valid: false, 
          duration: video.duration,
          message: `ვიდეო უნდა იყოს ${AVATAR_LIMITS.maxVideoDuration} წამზე ნაკლები` 
        });
      } else {
        resolve({ valid: true, duration: video.duration });
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ valid: false, message: 'ვიდეოს წაკითხვა ვერ მოხერხდა' });
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Compress image for avatar use
 */
export async function compressAvatarImage(
  file: File, 
  options: { maxSize?: number; quality?: number } = {}
): Promise<File> {
  const { maxSize = AVATAR_LIMITS.outputSize, quality = 0.85 } = options;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      
      // Set output size
      canvas.width = maxSize;
      canvas.height = maxSize;
      
      // Calculate crop to center
      const sourceSize = Math.min(img.width, img.height);
      const sourceX = (img.width - sourceSize) / 2;
      const sourceY = (img.height - sourceSize) / 2;
      
      // Draw centered and cropped
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceSize, sourceSize,
        0, 0, maxSize, maxSize
      );
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }
          
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if image is animated (GIF, APNG)
 */
export async function isAnimatedImage(file: File): Promise<boolean> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // GIF is always potentially animated
  if (extension === 'gif') {
    // Check for multiple frames in GIF
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Look for multiple graphic control extension blocks
    let frameCount = 0;
    for (let i = 0; i < bytes.length - 3; i++) {
      if (bytes[i] === 0x21 && bytes[i + 1] === 0xF9) {
        frameCount++;
        if (frameCount > 1) return true;
      }
    }
    return false;
  }
  
  // APNG detection
  if (extension === 'png' || extension === 'apng') {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Look for acTL chunk (APNG animation control)
    const acTL = [0x61, 0x63, 0x54, 0x4C]; // 'acTL'
    for (let i = 0; i < bytes.length - 4; i++) {
      if (bytes[i] === acTL[0] && bytes[i + 1] === acTL[1] && 
          bytes[i + 2] === acTL[2] && bytes[i + 3] === acTL[3]) {
        return true;
      }
    }
    return false;
  }
  
  // WebP animation detection
  if (extension === 'webp') {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Look for ANIM chunk (WebP animation)
    const ANIM = [0x41, 0x4E, 0x49, 0x4D]; // 'ANIM'
    for (let i = 0; i < bytes.length - 4; i++) {
      if (bytes[i] === ANIM[0] && bytes[i + 1] === ANIM[1] && 
          bytes[i + 2] === ANIM[2] && bytes[i + 3] === ANIM[3]) {
        return true;
      }
    }
    return false;
  }
  
  return false;
}

/**
 * Strip metadata from image (for security)
 */
export async function stripImageMetadata(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Metadata strip failed'));
            return;
          }
          
          const cleanFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          
          resolve(cleanFile);
        },
        file.type,
        1
      );
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate thumbnail from video
 */
export async function generateVideoThumbnail(file: File, time: number = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }
    
    video.onloadeddata = () => {
      video.currentTime = time;
    };
    
    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(video.src);
      resolve(thumbnail);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Video load failed'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}
