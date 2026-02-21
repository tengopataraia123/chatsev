import { useState, useMemo, useCallback } from 'react';
import { X, Link as LinkIcon, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import VideoEmbed from '@/components/shared/VideoEmbed';
import logActivity, { getActivityDescription } from '@/hooks/useActivityLog';

interface VideoShareComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Platform detection
const detectPlatform = (url: string): string => {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/facebook\.com/i.test(url)) return 'facebook';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  return 'other';
};

// Extract provider video ID
const extractProviderId = (url: string, platform: string): string | null => {
  switch (platform) {
    case 'youtube': {
      const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return match?.[1] || null;
    }
    case 'tiktok': {
      const match = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
      return match?.[1] || null;
    }
    case 'instagram': {
      const match = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
      return match?.[1] || null;
    }
    case 'vimeo': {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match?.[1] || null;
    }
    default:
      return null;
  }
};

// Normalize URL (remove tracking params)
const normalizeUrl = (url: string, platform: string, providerId: string | null): string => {
  if (!providerId) return url.split('?')[0];
  
  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${providerId}`;
    case 'tiktok':
      return url.split('?')[0];
    case 'instagram':
      return `https://www.instagram.com/p/${providerId}/`;
    case 'vimeo':
      return `https://vimeo.com/${providerId}`;
    default:
      return url.split('?')[0];
  }
};

// Get YouTube thumbnail
const getThumbnailUrl = (platform: string, providerId: string | null): string | null => {
  if (platform === 'youtube' && providerId) {
    return `https://i.ytimg.com/vi/${providerId}/hqdefault.jpg`;
  }
  return null;
};

// Validate URL
const isValidVideoUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith('javascript:')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Supported platforms check
const isSupportedPlatform = (url: string): boolean => {
  return /youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|vimeo\.com|twitter\.com|x\.com/i.test(url);
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  vimeo: 'Vimeo',
  twitter: 'X/Twitter',
  other: 'სხვა',
};

const VideoShareComposer = ({ open, onOpenChange, onSuccess }: VideoShareComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const urlInfo = useMemo(() => {
    if (!url.trim()) return null;
    if (!isValidVideoUrl(url.trim())) return { error: 'არასწორი ლინკი' };
    if (!isSupportedPlatform(url.trim())) return { error: 'ამ პლატფორმის ლინკი არ არის მხარდაჭერილი' };
    
    const platform = detectPlatform(url.trim());
    const providerId = extractProviderId(url.trim(), platform);
    const normalizedUrl = normalizeUrl(url.trim(), platform, providerId);
    const thumbnailUrl = getThumbnailUrl(platform, providerId);
    
    return { platform, providerId, normalizedUrl, thumbnailUrl, error: null };
  }, [url]);

  const handleSubmit = useCallback(async () => {
    if (!user?.id || !urlInfo || urlInfo.error || submitting) return;

    setSubmitting(true);
    try {
      const { data: insertedVideo, error } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          original_url: url.trim(),
          normalized_url: urlInfo.normalizedUrl,
          platform: urlInfo.platform,
          provider_video_id: urlInfo.providerId,
          thumbnail_url: urlInfo.thumbnailUrl,
          caption: caption.trim() || null,
          status: 'approved',
          title: caption.trim() || `${PLATFORM_LABELS[urlInfo.platform!]} ვიდეო`,
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      // Log activity to feed
      await logActivity({
        userId: user.id,
        activityType: 'video_share',
        description: getActivityDescription.videoShare(
          PLATFORM_LABELS[urlInfo.platform!],
          caption.trim() || undefined
        ),
        metadata: {
          video_id: insertedVideo?.id,
          video_url: url.trim(),
          platform: urlInfo.platform,
        }
      });

      toast({ title: 'ვიდეო გაზიარდა!' });
      setUrl('');
      setCaption('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error sharing video:', error);
      toast({ title: 'შეცდომა', description: error.message || 'ვიდეოს გაზიარება ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, url, urlInfo, caption, submitting, toast, onOpenChange, onSuccess]);

  const canSubmit = urlInfo && !urlInfo.error && !submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            ვიდეოს გაზიარება
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* URL Input */}
          <div>
            <Input
              placeholder="ჩასვი ვიდეოს ლინკი (YouTube, TikTok, Instagram, Facebook...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="text-base"
            />
            {urlInfo?.error && (
              <p className="text-sm text-destructive mt-1">{urlInfo.error}</p>
            )}
            {urlInfo && !urlInfo.error && (
              <p className="text-xs text-muted-foreground mt-1">
                პლატფორმა: {PLATFORM_LABELS[urlInfo.platform!]}
              </p>
            )}
          </div>

          {/* Preview */}
          {urlInfo && !urlInfo.error && url.trim() && (
            <div className="rounded-lg overflow-hidden border border-border">
              <VideoEmbed url={url.trim()} />
            </div>
          )}

          {/* Caption */}
          <Textarea
            placeholder="აღწერა (არასავალდებულო)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            maxLength={500}
            className="resize-none"
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              disabled={submitting}
            >
              გაუქმება
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1 gap-2" 
              disabled={!canSubmit}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              გააზიარე
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoShareComposer;
