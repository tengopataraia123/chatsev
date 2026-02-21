import { useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const MINIMUM_WATCH_TIME = 3; // seconds

export const useVideoViews = (videoId: string) => {
  const { user } = useAuth();
  const watchTimeRef = useRef(0);
  const [isViewRecorded, setIsViewRecorded] = useState(false);
  const isRecordingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const recordView = useCallback(async () => {
    if (isRecordingRef.current || !user?.id || !videoId) return;
    isRecordingRef.current = true;

    try {
      // UPSERT into video_unique_views — trigger handles count increment
      const { error } = await supabase
        .from('video_unique_views')
        .upsert({
          video_id: videoId,
          viewer_user_id: user.id,
          last_viewed_at: new Date().toISOString(),
        } as any, {
          onConflict: 'video_id,viewer_user_id',
          ignoreDuplicates: true, // If already exists, don't insert again (trigger won't fire)
        });

      if (!error) {
        setIsViewRecorded(true);
      }
    } catch (error) {
      console.error('Error recording view:', error);
      isRecordingRef.current = false;
    }
  }, [videoId, user?.id]);

  // Call this when video starts playing
  const startTracking = useCallback(() => {
    if (isViewRecorded || !user?.id) return;
    startTimeRef.current = Date.now();
  }, [isViewRecorded, user?.id]);

  // Call this periodically or on pause
  const checkAndRecord = useCallback(() => {
    if (isViewRecorded || !startTimeRef.current) return;
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    watchTimeRef.current += elapsed;
    startTimeRef.current = Date.now();

    if (watchTimeRef.current >= MINIMUM_WATCH_TIME && !isRecordingRef.current) {
      recordView();
    }
  }, [recordView, isViewRecorded]);

  // For iframe-based embeds: start a 3-second timer on click
  const startEmbedTimer = useCallback(() => {
    if (isViewRecorded || isRecordingRef.current || !user?.id) return;
    
    setTimeout(() => {
      if (!isRecordingRef.current) {
        recordView();
      }
    }, MINIMUM_WATCH_TIME * 1000);
  }, [recordView, isViewRecorded, user?.id]);

  const resetTracking = useCallback(() => {
    watchTimeRef.current = 0;
    startTimeRef.current = null;
    setIsViewRecorded(false);
    isRecordingRef.current = false;
  }, []);

  return {
    startTracking,
    checkAndRecord,
    startEmbedTimer,
    resetTracking,
    isViewRecorded,
  };
};
