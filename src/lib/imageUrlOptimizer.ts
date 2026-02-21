/**
 * Image URL Optimizer
 * Generates optimized Supabase Storage URLs with CDN-level
 * width/quality transforms. No re-download of unchanged images.
 */

import { getMediaPolicy } from './mobilePerformance';

const SUPABASE_STORAGE_PATTERN = /\.supabase\.co\/storage\/v1\/object\/public\//;

/**
 * Transform a Supabase Storage public URL into a render/resize URL.
 * Non-Supabase URLs pass through unchanged.
 */
export const getResizedImageUrl = (
  url: string | null | undefined,
  targetWidth?: number
): string => {
  if (!url) return '';
  if (!SUPABASE_STORAGE_PATTERN.test(url)) return url;

  const policy = getMediaPolicy();
  const width = targetWidth || policy.maxImageWidth;
  const quality = Math.round(policy.imageQuality * 100);

  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );
  const sep = transformed.includes('?') ? '&' : '?';
  return `${transformed}${sep}width=${width}&quality=${quality}`;
};

/** Small avatar optimization (80px default) */
export const getAvatarUrl = (url: string | null | undefined, size = 80): string =>
  getResizedImageUrl(url, size);

/** Responsive srcSet for <img> tags */
export const getSrcSet = (url: string | null | undefined): string => {
  if (!url || !SUPABASE_STORAGE_PATTERN.test(url)) return '';
  return [320, 640, 1080]
    .map(w => `${getResizedImageUrl(url, w)} ${w}w`)
    .join(', ');
};
