import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DJ_ROOM_ID = '00000000-0000-0000-0000-000000000001';
const DJ_LOLITA_ID = '00000000-0000-0000-0000-000000000000';

interface YouTubeVideoInfo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  durationMs: number;
}

// Parse ISO 8601 duration to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

// Fetch video info from YouTube Data API
async function getYouTubeVideoInfo(videoId: string, apiKey: string): Promise<YouTubeVideoInfo | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
    console.log('Fetching YouTube video info for:', videoId);
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('YouTube API response status:', response.status);
    
    if (data.error) {
      console.error('YouTube API error response:', JSON.stringify(data.error));
      return null;
    }
    
    if (!data.items || data.items.length === 0) {
      console.log('No video found for ID:', videoId, 'Response:', JSON.stringify(data));
      return null;
    }
    
    const video = data.items[0];
    const durationMs = parseDuration(video.contentDetails.duration);
    
    console.log('Video found:', video.snippet.title, 'by', video.snippet.channelTitle);
    
    return {
      id: videoId,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
      duration: video.contentDetails.duration,
      durationMs
    };
  } catch (error) {
    console.error('YouTube API fetch error:', error);
    return null;
  }
}

// Extract YouTube video ID from URL
function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, url, user_id, track_id, room_id = DJ_ROOM_ID } = body;
    
    console.log('DJ YouTube action:', action);

    // Get video info from YouTube
    if (action === 'get_info') {
      const videoId = extractVideoId(url);
      if (!videoId) {
        return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (!youtubeApiKey) {
        // Fallback without API key
        return new Response(JSON.stringify({
          id: videoId,
          title: 'YouTube Video',
          channelTitle: 'Unknown',
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          durationMs: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const info = await getYouTubeVideoInfo(videoId, youtubeApiKey);
      if (!info) {
        return new Response(JSON.stringify({ 
          id: videoId,
          title: 'YouTube Video',
          channelTitle: 'Unknown',
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          durationMs: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(info), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Add track to queue with round-robin positioning
    if (action === 'add_to_queue') {
      const videoId = extractVideoId(url);
      if (!videoId || !user_id) {
        return new Response(JSON.stringify({ error: 'Missing video URL or user ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Check user queue limit
      const { data: settings } = await supabase
        .from('dj_room_settings')
        .select('max_queue_per_user')
        .eq('room_id', room_id)
        .single();
      
      const maxPerUser = settings?.max_queue_per_user || 3;
      
      // Count user's current queue items
      const { data: userQueue } = await supabase
        .from('dj_room_queue')
        .select('id, track:dj_room_tracks(requested_by_user_id)')
        .eq('room_id', room_id)
        .eq('status', 'queued');
      
      const userQueueCount = userQueue?.filter((q: any) => {
        const track = q.track;
        return track && !Array.isArray(track) && track.requested_by_user_id === user_id;
      }).length || 0;
      
      if (userQueueCount >= maxPerUser) {
        return new Response(JSON.stringify({ 
          error: `მაქსიმუმ ${maxPerUser} სიმღერა შეგიძლიათ რიგში დაამატოთ`,
          queue_limit_reached: true
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Check if user is muted
      const { data: userStats } = await supabase
        .from('dj_user_queue_stats')
        .select('is_muted, muted_until')
        .eq('room_id', room_id)
        .eq('user_id', user_id)
        .maybeSingle();
      
      if (userStats?.is_muted) {
        if (userStats.muted_until && new Date(userStats.muted_until) < new Date()) {
          // Unmute if expired
          await supabase
            .from('dj_user_queue_stats')
            .update({ is_muted: false, muted_until: null })
            .eq('room_id', room_id)
            .eq('user_id', user_id);
        } else {
          return new Response(JSON.stringify({ 
            error: 'თქვენ ვერ დაამატებთ სიმღერებს, დროებით დაბლოკილი ხართ',
            is_muted: true
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Get video info
      let videoInfo: YouTubeVideoInfo | null = null;
      if (youtubeApiKey) {
        videoInfo = await getYouTubeVideoInfo(videoId, youtubeApiKey);
      }
      
      const title = videoInfo?.title || body.title || 'YouTube Video';
      const artist = videoInfo?.channelTitle || body.artist || null;
      const thumbnail = videoInfo?.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      const durationMs = videoInfo?.durationMs || null;
      
      // Create track
      const { data: track, error: trackError } = await supabase
        .from('dj_room_tracks')
        .insert({
          room_id,
          source_type: 'youtube',
          title,
          artist,
          youtube_video_id: videoId,
          thumbnail_url: thumbnail,
          duration_ms: durationMs,
          url: url,
          requested_by_user_id: user_id,
          created_by: DJ_LOLITA_ID,
          dedication: body.dedication || null
        })
        .select()
        .single();
      
      if (trackError) {
        console.error('Error creating track:', trackError);
        return new Response(JSON.stringify({ error: 'Failed to create track' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Calculate round-robin position
      // Get all users with items in queue and their last positions
      const { data: allQueue } = await supabase
        .from('dj_room_queue')
        .select('id, added_by, position, round_robin_position, track:dj_room_tracks(requested_by_user_id)')
        .eq('room_id', room_id)
        .eq('status', 'queued')
        .order('position', { ascending: true });
      
      let newPosition = 1;
      let roundRobinPos = 0;
      
      if (allQueue && allQueue.length > 0) {
        // Find the next fair position using round-robin
        const userCounts: Map<string, number> = new Map();
        allQueue.forEach((q: any) => {
          const track = q.track;
          const reqUserId = (track && !Array.isArray(track) ? track.requested_by_user_id : null) || q.added_by;
          userCounts.set(reqUserId, (userCounts.get(reqUserId) || 0) + 1);
        });
        
        // User's current item count (before adding)
        const userCurrentCount = userCounts.get(user_id) || 0;
        roundRobinPos = userCurrentCount + 1;
        
        // Find position: insert after last item with same or lower round-robin position
        let insertAfterIndex = -1;
        for (let i = allQueue.length - 1; i >= 0; i--) {
          if ((allQueue[i].round_robin_position || 1) <= roundRobinPos) {
            insertAfterIndex = i;
            break;
          }
        }
        
        if (insertAfterIndex === -1) {
          // Insert at beginning
          newPosition = 1;
          // Shift all positions up
          for (const item of allQueue) {
            await supabase
              .from('dj_room_queue')
              .update({ position: item.position + 1 })
              .eq('id', item.id);
          }
        } else {
          newPosition = allQueue[insertAfterIndex].position + 1;
          // Shift items after insert point
          for (let i = insertAfterIndex + 1; i < allQueue.length; i++) {
            await supabase
              .from('dj_room_queue')
              .update({ position: allQueue[i].position + 1 })
              .eq('id', allQueue[i].id);
          }
        }
      }
      
      // Add to queue
      const { error: queueError } = await supabase
        .from('dj_room_queue')
        .insert({
          room_id,
          track_id: track.id,
          position: newPosition,
          round_robin_position: roundRobinPos,
          added_by: user_id,
          status: 'queued'
        });
      
      if (queueError) {
        console.error('Error adding to queue:', queueError);
        return new Response(JSON.stringify({ error: 'Failed to add to queue' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Update user queue stats
      await supabase
        .from('dj_user_queue_stats')
        .upsert({
          room_id,
          user_id,
          current_queue_count: userQueueCount + 1,
          last_added_at: new Date().toISOString()
        }, { onConflict: 'room_id,user_id' });
      
      // Check if nothing is playing - if so, start immediately
      const { data: roomState } = await supabase
        .from('dj_room_state')
        .select('current_track_id, paused')
        .eq('room_id', room_id)
        .single();
      
      if (!roomState?.current_track_id || roomState?.paused) {
        // Start playing this track
        await supabase
          .from('dj_room_state')
          .update({
            current_track_id: track.id,
            source_type: 'youtube',
            youtube_video_id: videoId,
            playback_url: null,
            started_at: new Date().toISOString(),
            paused: false,
            seek_base_ms: 0,
            updated_by: DJ_LOLITA_ID,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', room_id);
        
        // Remove from queue since it's now playing
        await supabase
          .from('dj_room_queue')
          .delete()
          .eq('track_id', track.id);
        
        // Log to play history
        await supabase
          .from('dj_play_history')
          .insert({
            room_id,
            track_id: track.id,
            youtube_video_id: videoId,
            title,
            artist,
            requested_by_user_id: user_id,
            duration_ms: durationMs
          });
      }
      
      return new Response(JSON.stringify({
        success: true,
        track_id: track.id,
        title,
        artist,
        position: newPosition,
        started_playing: !roomState?.current_track_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Play next from queue
    if (action === 'play_next') {
      // Get settings
      const { data: settings } = await supabase
        .from('dj_room_settings')
        .select('*')
        .eq('room_id', room_id)
        .single();
      
      // Get next from queue
      const { data: nextItem } = await supabase
        .from('dj_room_queue')
        .select('*, track:dj_room_tracks(*)')
        .eq('room_id', room_id)
        .eq('status', 'queued')
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (nextItem?.track) {
        const track = nextItem.track;
        
        // Update room state
        await supabase
          .from('dj_room_state')
          .update({
            current_track_id: track.id,
            source_type: track.source_type,
            youtube_video_id: track.youtube_video_id,
            playback_url: track.url,
            started_at: new Date().toISOString(),
            paused: false,
            seek_base_ms: 0,
            updated_by: DJ_LOLITA_ID,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', room_id);
        
        // Remove from queue
        await supabase
          .from('dj_room_queue')
          .delete()
          .eq('id', nextItem.id);
        
        // Log to history
        await supabase
          .from('dj_play_history')
          .insert({
            room_id,
            track_id: track.id,
            youtube_video_id: track.youtube_video_id,
            title: track.title,
            artist: track.artist,
            requested_by_user_id: track.requested_by_user_id,
            duration_ms: track.duration_ms
          });
        
        // Update user stats
        if (track.requested_by_user_id) {
          const { data: stats } = await supabase
            .from('dj_user_queue_stats')
            .select('current_queue_count, total_played')
            .eq('room_id', room_id)
            .eq('user_id', track.requested_by_user_id)
            .maybeSingle();
          
          await supabase
            .from('dj_user_queue_stats')
            .upsert({
              room_id,
              user_id: track.requested_by_user_id,
              current_queue_count: Math.max(0, (stats?.current_queue_count || 1) - 1),
              total_played: (stats?.total_played || 0) + 1
            }, { onConflict: 'room_id,user_id' });
        }
        
        return new Response(JSON.stringify({
          success: true,
          now_playing: track.title,
          track
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // No user queue - check fallback
      if (settings?.fallback_enabled) {
        const { data: fallback } = await supabase
          .from('dj_fallback_playlist')
          .select('*')
          .eq('room_id', room_id)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (fallback) {
          // Play from fallback
          await supabase
            .from('dj_room_state')
            .update({
              current_track_id: null,
              source_type: 'youtube',
              youtube_video_id: fallback.youtube_video_id,
              playback_url: null,
              started_at: new Date().toISOString(),
              paused: false,
              seek_base_ms: 0,
              updated_by: DJ_LOLITA_ID,
              updated_at: new Date().toISOString()
            })
            .eq('room_id', room_id);
          
          // Move to end of fallback
          const { data: maxPos } = await supabase
            .from('dj_fallback_playlist')
            .select('position')
            .eq('room_id', room_id)
            .order('position', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          await supabase
            .from('dj_fallback_playlist')
            .update({ position: (maxPos?.position || 0) + 1 })
            .eq('id', fallback.id);
          
          // Log to history
          await supabase
            .from('dj_play_history')
            .insert({
              room_id,
              youtube_video_id: fallback.youtube_video_id,
              title: fallback.title || 'Fallback Track',
              artist: fallback.artist,
              duration_ms: fallback.duration_ms
            });
          
          return new Response(JSON.stringify({
            success: true,
            now_playing: fallback.title,
            is_fallback: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Nothing to play
      await supabase
        .from('dj_room_state')
        .update({
          current_track_id: null,
          youtube_video_id: null,
          playback_url: null,
          source_type: null,
          paused: true,
          updated_at: new Date().toISOString()
        })
        .eq('room_id', room_id);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Queue is empty'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Remove user's track from queue
    if (action === 'remove_from_queue') {
      if (!track_id || !user_id) {
        return new Response(JSON.stringify({ error: 'Missing track_id or user_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Verify ownership or admin
      const { data: track } = await supabase
        .from('dj_room_tracks')
        .select('requested_by_user_id')
        .eq('id', track_id)
        .single();
      
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id)
        .maybeSingle();
      
      const isAdmin = role?.role === 'admin' || role?.role === 'super_admin';
      
      if (!isAdmin && track?.requested_by_user_id !== user_id) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      await supabase
        .from('dj_room_queue')
        .delete()
        .eq('track_id', track_id);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // React to track
    if (action === 'react') {
      const { reaction_type } = body;
      if (!track_id || !user_id || !reaction_type) {
        return new Response(JSON.stringify({ error: 'Missing parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Upsert reaction
      const { data: existing } = await supabase
        .from('dj_track_reactions')
        .select('id, reaction_type')
        .eq('room_id', room_id)
        .eq('track_id', track_id)
        .eq('user_id', user_id)
        .maybeSingle();
      
      if (existing) {
        if (existing.reaction_type === reaction_type) {
          // Remove reaction
          await supabase
            .from('dj_track_reactions')
            .delete()
            .eq('id', existing.id);
        } else {
          // Update reaction
          await supabase
            .from('dj_track_reactions')
            .update({ reaction_type })
            .eq('id', existing.id);
        }
      } else {
        // Insert new
        await supabase
          .from('dj_track_reactions')
          .insert({ room_id, track_id, user_id, reaction_type });
      }
      
      // Update counts
      const { count: likes } = await supabase
        .from('dj_track_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', track_id)
        .eq('reaction_type', 'like');
      
      const { count: dislikes } = await supabase
        .from('dj_track_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', track_id)
        .eq('reaction_type', 'dislike');
      
      await supabase
        .from('dj_room_tracks')
        .update({ likes_count: likes || 0, dislikes_count: dislikes || 0 })
        .eq('id', track_id);
      
      return new Response(JSON.stringify({ success: true, likes, dislikes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('DJ YouTube error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
