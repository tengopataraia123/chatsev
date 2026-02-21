import { memo, forwardRef } from 'react';

interface EditContentPreviewProps {
  gifUrls: string[];
  onRemoveGif?: (gifUrl: string) => void;
  className?: string;
}

// GIF marker regex - matches [GIF:URL] format
const GIF_REGEX = /\[GIF:(https?:\/\/[^\]]+)\]/g;

/**
 * Renders GIF images in edit preview with remove button
 */
const EditContentPreview = memo(forwardRef<HTMLDivElement, EditContentPreviewProps>(
  ({ gifUrls, onRemoveGif, className = '' }, ref) => {
    if (!gifUrls || gifUrls.length === 0) {
      return null;
    }

    return (
      <div ref={ref} className={`flex flex-wrap gap-2 mb-2 ${className}`}>
        {gifUrls.map((url, index) => (
          <div key={`${url}-${index}`} className="relative">
            <img 
              src={url} 
              alt="GIF"
              className="w-14 h-14 object-contain rounded-lg border border-border bg-muted/30"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {onRemoveGif && (
              <button
                type="button"
                onClick={() => onRemoveGif(url)}
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold shadow-sm"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }
));

EditContentPreview.displayName = 'EditContentPreview';

export default EditContentPreview;

/**
 * Helper to remove a GIF URL from array
 */
export const removeGifUrl = (gifUrls: string[], urlToRemove: string): string[] => {
  return gifUrls.filter(url => url !== urlToRemove);
};

/**
 * Get clean text without GIF markers (for display in textarea)
 */
export const getTextWithoutGifs = (content: string): string => {
  return content.replace(GIF_REGEX, '').replace(/\s+/g, ' ').trim();
};

/**
 * Extract all GIF URLs from content
 */
export const extractGifUrls = (content: string): string[] => {
  const urls: string[] = [];
  let match;
  const regex = new RegExp(GIF_REGEX.source, 'g');
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  return urls;
};

/**
 * Rebuild content with text and GIF markers
 */
export const buildContentWithGifs = (text: string, gifUrls: string[]): string => {
  const parts = [text.trim()];
  gifUrls.forEach(url => {
    parts.push(`[GIF:${url}]`);
  });
  return parts.filter(Boolean).join(' ');
};

// Legacy export for backwards compatibility
export const removeGifFromContent = (content: string, gifUrl: string): string => {
  const escapedUrl = gifUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\[GIF:${escapedUrl}\\]\\s*`, 'g');
  return content.replace(regex, '').replace(/\s+/g, ' ').trim();
};
