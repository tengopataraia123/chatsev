import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { StoryType, TextStoryContent } from '../types';

interface UploadStoryParams {
  type: StoryType;
  file?: File;
  textContent?: TextStoryContent;
  backgroundStyle?: string;
  fontStyle?: string;
  duration?: number;
  musicTitle?: string;
  musicUrl?: string;
  musicArtist?: string;
  musicStartTime?: number;
  musicDeezerId?: string;
}

export const useStoryUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadStory = useCallback(async ({
    type,
    file,
    textContent,
    backgroundStyle,
    fontStyle,
    duration = 30,
    musicTitle,
    musicUrl,
    musicArtist,
    musicStartTime = 0,
    musicDeezerId
  }: UploadStoryParams) => {
    if (!user?.id) {
      toast({ title: 'შეცდომა', description: 'გაიარეთ ავტორიზაცია', variant: 'destructive' });
      return null;
    }

    setUploading(true);
    setProgress(10);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      // Upload media file if exists
      if (file && (type === 'photo' || type === 'video')) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const bucket = type === 'photo' ? 'story-images' : 'story-videos';

        setProgress(30);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        setProgress(70);

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(uploadData.path);

        if (type === 'photo') {
          imageUrl = urlData.publicUrl;
        } else {
          videoUrl = urlData.publicUrl;
        }
      }

      setProgress(80);

      // Calculate expiration (24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Insert story with pending status
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          story_type: type,
          image_url: imageUrl,
          video_url: videoUrl,
          content: textContent?.text || null,
          text_content: textContent ? textContent : null,
          background_style: backgroundStyle || null,
          font_style: fontStyle || 'bold',
          duration_seconds: 30,
          expires_at: expiresAt.toISOString(),
          music_title: musicTitle || null,
          music_url: musicUrl || null,
          music_artist: musicArtist || null,
          music_start_time: musicStartTime || 0,
          music_deezer_id: musicDeezerId || null,
          status: 'pending'
        } as any)
        .select()
        .single();

      if (storyError) throw storyError;

      // Insert into pending_approvals for admin moderation
      await supabase
        .from('pending_approvals')
        .insert({
          type: 'story',
          user_id: user.id,
          content_id: story.id,
          content_data: {
            image_url: imageUrl,
            video_url: videoUrl,
            content: textContent?.text || null,
          },
          status: 'pending'
        });

      setProgress(100);

      toast({ title: 'წარმატება', description: 'სთორი გაიგზავნა დასადასტურებლად!' });
      return story;

    } catch (error: any) {
      console.error('Error uploading story:', error);
      toast({ 
        title: 'შეცდომა', 
        description: error.message || 'სთორის ატვირთვა ვერ მოხერხდა', 
        variant: 'destructive' 
      });
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [user?.id, toast]);

  return { uploadStory, uploading, progress };
};
