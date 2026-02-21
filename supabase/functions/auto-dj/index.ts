import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DJ_ROOM_ID = '00000000-0000-0000-0000-000000000001';
const AUTO_DJ_USER_ID = '00000000-0000-0000-0000-000000000000'; // Virtual Auto-DJ user

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, user_id } = body;
    console.log('Auto-DJ action:', action);

    if (action === 'process_requests') {
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('dj_room_requests')
        .select('*')
        .eq('room_id', DJ_ROOM_ID)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
        throw requestsError;
      }

      let processedCount = 0;
      for (const request of pendingRequests || []) {
        let youtubeVideoId = null;
        if (request.youtube_link) {
          const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
          ];
          for (const pattern of patterns) {
            const match = request.youtube_link.match(pattern);
            if (match) {
              youtubeVideoId = match[1];
              break;
            }
          }
        }

        const { data: track, error: trackError } = await supabase
          .from('dj_room_tracks')
          .insert({
            room_id: DJ_ROOM_ID,
            source_type: youtubeVideoId ? 'youtube' : 'upload',
            title: request.song_title,
            artist: request.artist,
            youtube_video_id: youtubeVideoId,
            url: request.youtube_link,
            created_by: AUTO_DJ_USER_ID,
            requested_by_user_id: request.from_user_id,
            dedication: request.dedication
          })
          .select()
          .single();

        if (trackError) {
          console.error('Error creating track:', trackError);
          continue;
        }

        const { data: currentQueue } = await supabase
          .from('dj_room_queue')
          .select('position')
          .eq('room_id', DJ_ROOM_ID)
          .order('position', { ascending: false })
          .limit(1);

        const maxPosition = currentQueue && currentQueue.length > 0 ? currentQueue[0].position : 0;

        const { error: queueError } = await supabase
          .from('dj_room_queue')
          .insert({
            room_id: DJ_ROOM_ID,
            track_id: track.id,
            position: maxPosition + 1,
            added_by: AUTO_DJ_USER_ID
          });

        if (queueError) {
          console.error('Error adding to queue:', queueError);
          continue;
        }

        await supabase
          .from('dj_room_requests')
          .update({
            status: 'accepted',
            handled_by: AUTO_DJ_USER_ID,
            handled_at: new Date().toISOString()
          })
          .eq('id', request.id);

        processedCount++;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        processed: processedCount,
        message: `Processed ${processedCount} requests`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'play_next') {
      const { data: queueItems, error: queueError } = await supabase
        .from('dj_room_queue')
        .select('*, track:dj_room_tracks(*)')
        .eq('room_id', DJ_ROOM_ID)
        .eq('status', 'queued')
        .order('position', { ascending: true })
        .limit(1);

      if (!queueItems || queueItems.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Queue is empty' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextItem = queueItems[0];
      const track = nextItem.track;

      if (!track) {
        await supabase.from('dj_room_queue').delete().eq('id', nextItem.id);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Track not found' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await supabase
        .from('dj_room_state')
        .update({
          source_type: track.source_type,
          current_track_id: track.id,
          playback_url: track.url,
          youtube_video_id: track.youtube_video_id,
          started_at: new Date().toISOString(),
          paused: false,
          seek_base_ms: 0,
          updated_by: AUTO_DJ_USER_ID,
          updated_at: new Date().toISOString()
        })
        .eq('room_id', DJ_ROOM_ID);

      await supabase
        .from('dj_room_queue')
        .delete()
        .eq('id', nextItem.id);

      return new Response(JSON.stringify({ 
        success: true, 
        now_playing: track.title,
        track_id: track.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'process_and_play') {
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('dj_room_requests')
        .select('*')
        .eq('room_id', DJ_ROOM_ID)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (!requestsError && pendingRequests && pendingRequests.length > 0) {
        for (const request of pendingRequests) {
          let youtubeVideoId = null;
          if (request.youtube_link) {
            const patterns = [
              /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
              /^([a-zA-Z0-9_-]{11})$/
            ];
            for (const pattern of patterns) {
              const match = request.youtube_link.match(pattern);
              if (match) {
                youtubeVideoId = match[1];
                break;
              }
            }
          }

          const { data: track, error: trackError } = await supabase
            .from('dj_room_tracks')
            .insert({
              room_id: DJ_ROOM_ID,
              source_type: youtubeVideoId ? 'youtube' : 'upload',
              title: request.song_title,
              artist: request.artist,
              youtube_video_id: youtubeVideoId,
              url: request.youtube_link,
              created_by: AUTO_DJ_USER_ID,
              requested_by_user_id: request.from_user_id,
              dedication: request.dedication
            })
            .select()
            .single();

          if (trackError) continue;

          const { data: currentQueue } = await supabase
            .from('dj_room_queue')
            .select('position')
            .eq('room_id', DJ_ROOM_ID)
            .order('position', { ascending: false })
            .limit(1);

          const maxPosition = currentQueue && currentQueue.length > 0 ? currentQueue[0].position : 0;

          await supabase
            .from('dj_room_queue')
            .insert({
              room_id: DJ_ROOM_ID,
              track_id: track.id,
              position: maxPosition + 1,
              added_by: AUTO_DJ_USER_ID
            });

          await supabase
            .from('dj_room_requests')
            .update({
              status: 'accepted',
              handled_by: AUTO_DJ_USER_ID,
              handled_at: new Date().toISOString()
            })
            .eq('id', request.id);
        }
      }

      const { data: queueItems } = await supabase
        .from('dj_room_queue')
        .select('*, track:dj_room_tracks(*)')
        .eq('room_id', DJ_ROOM_ID)
        .eq('status', 'queued')
        .order('position', { ascending: true })
        .limit(1);

      if (!queueItems || queueItems.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Queue is empty',
          requests_processed: pendingRequests?.length || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const nextItem = queueItems[0];
      const track = nextItem.track;

      if (track) {
        await supabase
          .from('dj_room_state')
          .update({
            source_type: track.source_type,
            current_track_id: track.id,
            playback_url: track.url,
            youtube_video_id: track.youtube_video_id,
            started_at: new Date().toISOString(),
            paused: false,
            seek_base_ms: 0,
            updated_by: AUTO_DJ_USER_ID,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', DJ_ROOM_ID);

        await supabase
          .from('dj_room_queue')
          .delete()
          .eq('id', nextItem.id);

        return new Response(JSON.stringify({ 
          success: true, 
          now_playing: track.title,
          track_id: track.id,
          requests_processed: pendingRequests?.length || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'get_queue_position') {
      const { data: queueItems } = await supabase
        .from('dj_room_queue')
        .select('*, track:dj_room_tracks(requested_by_user_id)')
        .eq('room_id', DJ_ROOM_ID)
        .eq('status', 'queued')
        .order('position', { ascending: true });

      let position = 0;
      if (queueItems) {
        for (let i = 0; i < queueItems.length; i++) {
          if (queueItems[i].track?.requested_by_user_id === user_id) {
            position = i + 1;
            break;
          }
        }
      }

      const { data: pendingRequests } = await supabase
        .from('dj_room_requests')
        .select('*')
        .eq('room_id', DJ_ROOM_ID)
        .eq('status', 'pending')
        .eq('from_user_id', user_id)
        .order('created_at', { ascending: true });

      const totalQueueLength = queueItems?.length || 0;
      
      return new Response(JSON.stringify({ 
        success: true,
        queue_position: position,
        total_in_queue: totalQueueLength,
        has_pending_request: (pendingRequests?.length || 0) > 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Auto-DJ error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
