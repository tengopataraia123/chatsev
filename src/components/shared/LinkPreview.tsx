import { useState, useEffect, memo } from 'react';
import { ExternalLink, Play, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  isVideo: boolean;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

// Simple in-memory cache for previews
const previewCache = new Map<string, LinkPreviewData | null>();

// Create fallback preview from URL
const createFallbackPreview = (url: string): LinkPreviewData => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Detect if it's a video/streaming site
    const isVideo = url.includes('/video/') || 
                   url.includes('/match/') || 
                   url.includes('/live/') ||
                   url.includes('/watch/') ||
                   url.includes('/stream/') ||
                   ['liveball', 'livetv', 'sport', 'stream', 'watch'].some(s => hostname.includes(s));
    
    // Generate a title from path
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    let title = hostname;
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && !/^\d+$/.test(lastPart)) {
        title = lastPart.replace(/-/g, ' ').replace(/_/g, ' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
    }
    
    return {
      url,
      title: isVideo ? `🔴 ლაივ სტრიმი - ${hostname}` : title,
      description: isVideo ? 'დააჭირე სანახავად' : hostname,
      image: null,
      siteName: hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      isVideo
    };
  } catch {
    return {
      url,
      title: 'ლინკი',
      description: url,
      image: null,
      siteName: url,
      favicon: null,
      isVideo: false
    };
  }
};

const LinkPreview = memo(({ url, className = '' }: LinkPreviewProps) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      // Check cache first
      if (previewCache.has(url)) {
        const cached = previewCache.get(url);
        setPreview(cached || createFallbackPreview(url));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase.functions.invoke('link-preview', {
          body: { url }
        });

        if (fetchError || !data?.success) {
          // Use fallback preview when fetch fails
          const fallback = createFallbackPreview(url);
          previewCache.set(url, fallback);
          setPreview(fallback);
          return;
        }

        previewCache.set(url, data.data);
        setPreview(data.data);
      } catch (err) {
        console.error('Link preview error:', err);
        // Use fallback preview on error
        const fallback = createFallbackPreview(url);
        previewCache.set(url, fallback);
        setPreview(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  const handleClick = () => {
    // Open in new tab (iframe embedding is blocked by most sites)
    window.open(preview?.url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={`animate-pulse rounded-xl overflow-hidden border border-border ${className}`}>
        <div className="h-24 bg-muted" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const hostname = new URL(preview.url).hostname.replace('www.', '');

  return (
    <div
      onClick={handleClick}
      className={`block rounded-xl overflow-hidden border border-border bg-card hover:bg-muted/50 transition-colors group cursor-pointer ${className}`}
    >
      {/* Image/Thumbnail or Video Placeholder */}
      {preview.image && !imageError ? (
        <div className="relative aspect-video bg-muted overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title || 'Preview'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
          {preview.isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </div>
          )}
          {(preview.url.includes('/match/') || preview.url.includes('/live/') || preview.isVideo) && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
        </div>
      ) : preview.isVideo ? (
        // Fallback for video/streaming links without image
        <div className="relative h-28 bg-gradient-to-br from-red-900 via-red-800 to-black overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 left-2 w-8 h-8 border-2 border-white/30 rounded" />
            <div className="absolute top-2 right-2 w-8 h-8 border-2 border-white/30 rounded" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-2 border-white/30 rounded" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-2 border-white/30 rounded" />
          </div>
          <div className="relative flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
          <div className="absolute top-3 left-3 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="p-3">
        {/* Site info */}
        <div className="flex items-center gap-2 mb-2">
          {preview.favicon ? (
            <img 
              src={preview.favicon} 
              alt="" 
              className="w-4 h-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {hostname}
          </span>
          {preview.isVideo ? (
            <span className="ml-auto text-xs text-primary font-medium">დააჭირე გასახსნელად</span>
          ) : (
            <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Title */}
        {preview.title && (
          <h4 className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {preview.title}
          </h4>
        )}

        {/* Description */}
        {preview.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {preview.description}
          </p>
        )}
      </div>
    </div>
  );
});

LinkPreview.displayName = 'LinkPreview';

// Extract general URL from text (not video URLs which are handled by VideoEmbed)
export const extractLinkUrl = (text: string): string | null => {
  // General URL pattern
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlPattern);
  
  if (!matches || matches.length === 0) return null;
  
  // Filter out video URLs that are already handled by VideoEmbed
  const videoPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /youtube\.com\/shorts/i,
    /tiktok\.com\/@[\w.-]+\/video/i,
    /vm\.tiktok\.com/i,
    /vt\.tiktok\.com/i,
    /facebook\.com\/.*\/videos/i,
    /facebook\.com\/watch/i,
    /twitter\.com\/\w+\/status/i,
    /x\.com\/\w+\/status/i,
    /vimeo\.com\/\d+/i,
    /instagram\.com\/(?:reel|p)\//i
  ];
  
  for (const match of matches) {
    const isVideoUrl = videoPatterns.some(pattern => pattern.test(match));
    if (!isVideoUrl) {
      return match;
    }
  }
  
  return null;
};

export default LinkPreview;
