import { useMemo, useState, memo } from 'react';
import { Play } from 'lucide-react';

interface VideoEmbedProps {
  url: string;
  className?: string;
}

// YouTube Thumbnail component - loads fast, shows iframe only on click
const YouTubeThumbnail = memo(({ videoId, embedUrl }: { videoId: string; embedUrl: string }) => {
  const [showIframe, setShowIframe] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const fallbackUrl = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  
  if (showIframe) {
    return (
      <div className="aspect-video">
        <iframe
          src={`${embedUrl}&autoplay=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    );
  }
  
  return (
    <div 
      className="aspect-video relative cursor-pointer group bg-muted"
      onClick={() => setShowIframe(true)}
    >
      <img 
        src={imgError ? fallbackUrl : thumbnailUrl}
        alt="Video thumbnail"
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => {
          if (!imgError) setImgError(true);
        }}
      />
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-8 h-8 text-white ml-1" fill="white" />
        </div>
      </div>
      {/* YouTube logo */}
      <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white font-medium">
        YouTube
      </div>
    </div>
  );
});
YouTubeThumbnail.displayName = 'YouTubeThumbnail';

// TikTok Card Component - TikTok doesn't support inline embedding like YouTube
const TikTokCard = ({ url }: { url: string }) => {
  return (
    <div className="flex justify-center">
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-[200px] rounded-xl overflow-hidden bg-gradient-to-br from-[#ff0050] via-[#00f2ea] to-[#000] p-[2px] hover:scale-105 transition-transform"
      >
        <div className="bg-black rounded-xl p-4 flex flex-col items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center">
            <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
              <path d="M34.145 12.24c-2.012-1.342-3.4-3.539-3.664-6.09A7.725 7.725 0 0 1 30.4 4.8h-5.76v26.88a4.8 4.8 0 1 1-3.36-4.56V21.28a10.56 10.56 0 1 0 9.12 10.56V18.96a13.44 13.44 0 0 0 7.68 2.4V15.6a7.68 7.68 0 0 1-3.935-3.36Z" fill="url(#tiktok-gradient)"/>
              <defs>
                <linearGradient id="tiktok-gradient" x1="0" y1="0" x2="48" y2="48">
                  <stop stopColor="#ff0050"/>
                  <stop offset="1" stopColor="#00f2ea"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-white font-medium text-sm">ნახე TikTok-ზე</span>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>გახსნა</span>
          </div>
        </div>
      </a>
    </div>
  );
};

const VideoEmbed = ({ url, className = '' }: VideoEmbedProps) => {
  const embedInfo = useMemo(() => {
    if (!url) return { type: 'unsupported', originalUrl: '' };
    // YouTube
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (youtubeMatch) {
      return {
        type: 'youtube',
        id: youtubeMatch[1],
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`
      };
    }

    // TikTok - full URL format
    const tiktokMatch = url.match(
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/
    );
    if (tiktokMatch) {
      return {
        type: 'tiktok',
        id: tiktokMatch[1],
        embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`
      };
    }

    // TikTok - short URL format (vm.tiktok.com or vt.tiktok.com)
    const tiktokShortMatch = url.match(
      /(?:vm|vt)\.tiktok\.com\/([a-zA-Z0-9]+)/
    );
    if (tiktokShortMatch) {
      return {
        type: 'tiktok-short',
        id: tiktokShortMatch[1],
        originalUrl: url
      };
    }

    // Facebook video
    const facebookMatch = url.match(
      /facebook\.com\/(?:watch\/?\?v=|[\w.-]+\/videos\/)(\d+)/
    );
    if (facebookMatch) {
      return {
        type: 'facebook',
        id: facebookMatch[1],
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`
      };
    }

    // Twitter/X video
    const twitterMatch = url.match(
      /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/
    );
    if (twitterMatch) {
      return {
        type: 'twitter',
        id: twitterMatch[1],
        embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${twitterMatch[1]}`
      };
    }

    // Vimeo
    const vimeoMatch = url.match(
      /vimeo\.com\/(\d+)/
    );
    if (vimeoMatch) {
      return {
        type: 'vimeo',
        id: vimeoMatch[1],
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
      };
    }

    // Instagram Reel/Video
    const instagramMatch = url.match(
      /instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/
    );
    if (instagramMatch) {
      return {
        type: 'instagram',
        id: instagramMatch[1],
        embedUrl: `https://www.instagram.com/p/${instagramMatch[1]}/embed`
      };
    }

    return null;
  }, [url]);

  if (!embedInfo) return null;

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black w-full max-w-full ${className}`}>
      {embedInfo.type === 'youtube' && (
        <YouTubeThumbnail videoId={embedInfo.id} embedUrl={embedInfo.embedUrl} />
      )}

      {embedInfo.type === 'tiktok' && (
        <TikTokCard url={`https://www.tiktok.com/@user/video/${embedInfo.id}`} />
      )}

      {embedInfo.type === 'tiktok-short' && embedInfo.originalUrl && (
        <TikTokCard url={embedInfo.originalUrl} />
      )}

      {embedInfo.type === 'facebook' && (
        <div className="aspect-video">
          <iframe
            src={embedInfo.embedUrl}
            className="w-full h-full"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            title="Facebook video"
          />
        </div>
      )}

      {embedInfo.type === 'twitter' && (
        <div className="min-h-[200px] max-h-[400px]">
          <iframe
            src={embedInfo.embedUrl}
            className="w-full h-full min-h-[200px]"
            allowFullScreen
            title="Twitter/X post"
          />
        </div>
      )}

      {embedInfo.type === 'vimeo' && (
        <div className="aspect-video">
          <iframe
            src={embedInfo.embedUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Vimeo video"
          />
        </div>
      )}

      {embedInfo.type === 'instagram' && (
        <div className="min-h-[400px] max-h-[600px]">
          <iframe
            src={embedInfo.embedUrl}
            className="w-full h-full min-h-[400px]"
            allowFullScreen
            title="Instagram post"
          />
        </div>
      )}
    </div>
  );
};

export const extractVideoUrl = (text: string): string | null => {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}(?:[&?][^\s]*)?/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/[a-zA-Z0-9_-]{11}(?:\?[^\s]*)?/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}(?:\?[^\s]*)?/,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+(?:\?[^\s]*)?/,
    /(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/[a-zA-Z0-9]+(?:\?[^\s]*)?/,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:watch\/?\?v=|[\w.-]+\/videos\/)\d+(?:\?[^\s]*)?/,
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/\d+(?:\?[^\s]*)?/,
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/\d+(?:\?[^\s]*)?/,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p)\/[a-zA-Z0-9_-]+(?:\?[^\s]*)?/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return null;
};

export const isVideoUrl = (text: string): boolean => {
  return extractVideoUrl(text) !== null;
};

// Helper to remove video URL from text for clean display
export const removeVideoUrl = (text: string): string => {
  const videoUrl = extractVideoUrl(text);
  if (!videoUrl) return text;
  return text.replace(videoUrl, '').trim();
};

export default VideoEmbed;
