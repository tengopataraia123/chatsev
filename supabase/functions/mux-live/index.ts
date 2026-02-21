import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID');
const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET');
const MUX_API_BASE = 'https://api.mux.com';

function getMuxAuth(): string {
  return btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);
}

async function muxRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${MUX_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${getMuxAuth()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Mux API error:', error);
    throw new Error(`Mux API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case 'create-live-stream': {
        const { userId, title, description } = params;
        
        if (!userId) {
          throw new Error('userId is required');
        }

        // Create Mux live stream
        const liveData = await muxRequest('/video/v1/live-streams', {
          method: 'POST',
          body: JSON.stringify({
            playback_policy: ['public'],
            new_asset_settings: {
              playback_policy: ['public'],
            },
            latency_mode: 'low',
          }),
        });

        const liveStream = liveData.data;
        const streamKey = liveStream.stream_key;
        const rtmpUrl = `rtmps://global-live.mux.com:443/app`;
        const playbackId = liveStream.playback_ids?.[0]?.id;

        // Create live stream record in database
        const { data: dbLiveStream, error: dbError } = await supabaseClient
          .from('live_streams')
          .insert({
            host_id: userId,
            title: title || 'ლაივ სტრიმი',
            status: 'prelive',
            mux_live_id: liveStream.id,
            mux_stream_key: streamKey,
            rtmp_url: rtmpUrl,
            playback_id: playbackId,
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          throw dbError;
        }

        return new Response(
          JSON.stringify({
            liveStreamId: dbLiveStream.id,
            muxLiveId: liveStream.id,
            streamKey,
            rtmpUrl,
            playbackId,
            playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-live-stream-status': {
        const { muxLiveId } = params;
        
        if (!muxLiveId) {
          throw new Error('muxLiveId is required');
        }

        const liveData = await muxRequest(`/video/v1/live-streams/${muxLiveId}`);
        const liveStream = liveData.data;

        // Update database with current status
        const status = liveStream.status === 'active' ? 'live' : 
                       liveStream.status === 'idle' ? 'prelive' : 'ended';

        await supabaseClient
          .from('live_streams')
          .update({ 
            status,
            viewer_count: liveStream.active_asset_id ? undefined : 0,
          })
          .eq('mux_live_id', muxLiveId);

        return new Response(
          JSON.stringify({
            status: liveStream.status,
            activeAssetId: liveStream.active_asset_id,
            recentAssetIds: liveStream.recent_asset_ids,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'end-live-stream': {
        const { muxLiveId, liveStreamId } = params;
        
        if (!muxLiveId) {
          throw new Error('muxLiveId is required');
        }

        // Signal stream complete
        await muxRequest(`/video/v1/live-streams/${muxLiveId}/complete`, {
          method: 'PUT',
        });

        // Update database
        if (liveStreamId) {
          await supabaseClient
            .from('live_streams')
            .update({ 
              status: 'ended',
              ended_at: new Date().toISOString(),
            })
            .eq('id', liveStreamId);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset-stream-key': {
        const { muxLiveId } = params;
        
        if (!muxLiveId) {
          throw new Error('muxLiveId is required');
        }

        const liveData = await muxRequest(`/video/v1/live-streams/${muxLiveId}/reset-stream-key`, {
          method: 'POST',
        });

        const newStreamKey = liveData.data.stream_key;

        // Update database
        await supabaseClient
          .from('live_streams')
          .update({ mux_stream_key: newStreamKey })
          .eq('mux_live_id', muxLiveId);

        return new Response(
          JSON.stringify({ streamKey: newStreamKey }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-live-stream': {
        const { muxLiveId } = params;
        
        if (!muxLiveId) {
          throw new Error('muxLiveId is required');
        }

        await muxRequest(`/video/v1/live-streams/${muxLiveId}`, {
          method: 'DELETE',
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
