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
      case 'create-upload': {
        // Create direct upload URL for client-side uploading
        const { userId, title, description } = params;
        
        if (!userId) {
          throw new Error('userId is required');
        }

        // Create Mux direct upload
        const uploadData = await muxRequest('/video/v1/uploads', {
          method: 'POST',
          body: JSON.stringify({
            cors_origin: '*',
            new_asset_settings: {
              playback_policy: ['public'],
              encoding_tier: 'baseline',
            },
          }),
        });

        const upload = uploadData.data;

        // Create video record in database
        const { data: video, error: videoError } = await supabaseClient
          .from('videos')
          .insert({
            user_id: userId,
            title: title || 'უსახელო ვიდეო',
            description: description || '',
            mux_upload_id: upload.id,
            processing_status: 'uploading',
            status: 'processing',
          })
          .select()
          .single();

        if (videoError) {
          console.error('Database error:', videoError);
          throw videoError;
        }

        return new Response(
          JSON.stringify({
            uploadUrl: upload.url,
            uploadId: upload.id,
            videoId: video.id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check-upload-status': {
        const { uploadId } = params;
        
        if (!uploadId) {
          throw new Error('uploadId is required');
        }

        const uploadData = await muxRequest(`/video/v1/uploads/${uploadId}`);
        const upload = uploadData.data;

        // If asset is created, update the video record
        if (upload.asset_id) {
          const assetData = await muxRequest(`/video/v1/assets/${upload.asset_id}`);
          const asset = assetData.data;

          const playbackId = asset.playback_ids?.[0]?.id;
          const duration = asset.duration;
          const thumbnailUrl = playbackId 
            ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
            : null;

          // Update video with asset info
          await supabaseClient
            .from('videos')
            .update({
              mux_asset_id: asset.id,
              mux_playback_id: playbackId,
              processing_status: asset.status === 'ready' ? 'ready' : 'processing',
              status: asset.status === 'ready' ? 'approved' : 'processing',
              duration: duration ? Math.round(duration) : null,
              thumbnail_url: thumbnailUrl,
              video_url: playbackId 
                ? `https://stream.mux.com/${playbackId}.m3u8`
                : null,
            })
            .eq('mux_upload_id', uploadId);

          return new Response(
            JSON.stringify({
              status: asset.status,
              playbackId,
              duration,
              thumbnailUrl,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            status: upload.status,
            assetId: upload.asset_id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-asset': {
        const { assetId } = params;
        
        if (!assetId) {
          throw new Error('assetId is required');
        }

        const assetData = await muxRequest(`/video/v1/assets/${assetId}`);
        
        return new Response(
          JSON.stringify(assetData.data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-asset': {
        const { assetId } = params;
        
        if (!assetId) {
          throw new Error('assetId is required');
        }

        await muxRequest(`/video/v1/assets/${assetId}`, {
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
