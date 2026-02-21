import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, mux-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    const eventType = payload.type;

    console.log('Received Mux webhook:', eventType);

    // Log the webhook
    await supabaseClient.from('mux_webhooks_log').insert({
      event_type: eventType,
      mux_asset_id: payload.data?.id || payload.object?.id,
      mux_live_id: payload.data?.live_stream_id,
      payload,
    });

    // Handle different event types
    switch (eventType) {
      case 'video.upload.created': {
        const uploadId = payload.data.id;
        console.log('Upload created:', uploadId);
        break;
      }

      case 'video.upload.asset_created': {
        const uploadId = payload.data.id;
        const assetId = payload.data.asset_id;
        console.log('Asset created from upload:', uploadId, assetId);

        // Update video with asset ID
        await supabaseClient
          .from('videos')
          .update({
            mux_asset_id: assetId,
            processing_status: 'processing',
          })
          .eq('mux_upload_id', uploadId);
        break;
      }

      case 'video.asset.created': {
        const assetId = payload.data.id;
        console.log('Asset created:', assetId);
        break;
      }

      case 'video.asset.ready': {
        const asset = payload.data;
        const playbackId = asset.playback_ids?.[0]?.id;
        const duration = asset.duration;
        const thumbnailUrl = playbackId 
          ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
          : null;

        console.log('Asset ready:', asset.id, playbackId);

        // Update video with ready status
        await supabaseClient
          .from('videos')
          .update({
            mux_playback_id: playbackId,
            processing_status: 'ready',
            status: 'approved',
            duration: duration ? Math.round(duration) : null,
            thumbnail_url: thumbnailUrl,
            video_url: playbackId 
              ? `https://stream.mux.com/${playbackId}.m3u8`
              : null,
          })
          .eq('mux_asset_id', asset.id);
        break;
      }

      case 'video.asset.errored': {
        const asset = payload.data;
        console.error('Asset error:', asset.id, asset.errors);

        await supabaseClient
          .from('videos')
          .update({
            processing_status: 'error',
            status: 'rejected',
          })
          .eq('mux_asset_id', asset.id);
        break;
      }

      case 'video.asset.deleted': {
        const assetId = payload.data.id;
        console.log('Asset deleted:', assetId);

        await supabaseClient
          .from('videos')
          .update({
            processing_status: 'deleted',
            status: 'rejected',
          })
          .eq('mux_asset_id', assetId);
        break;
      }

      case 'video.live_stream.created': {
        const liveStream = payload.data;
        console.log('Live stream created:', liveStream.id);
        break;
      }

      case 'video.live_stream.active': {
        const liveStream = payload.data;
        console.log('Live stream active:', liveStream.id);

        await supabaseClient
          .from('live_streams')
          .update({ 
            status: 'live',
            started_at: new Date().toISOString(),
          })
          .eq('mux_live_id', liveStream.id);
        break;
      }

      case 'video.live_stream.idle': {
        const liveStream = payload.data;
        console.log('Live stream idle:', liveStream.id);

        await supabaseClient
          .from('live_streams')
          .update({ status: 'waiting' })
          .eq('mux_live_id', liveStream.id);
        break;
      }

      case 'video.live_stream.disabled': {
        const liveStream = payload.data;
        console.log('Live stream disabled:', liveStream.id);

        await supabaseClient
          .from('live_streams')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('mux_live_id', liveStream.id);
        break;
      }

      case 'video.live_stream.recording.ready': {
        const liveStream = payload.data;
        const assetId = liveStream.recent_asset_ids?.[0];
        console.log('Recording ready:', liveStream.id, assetId);

        if (assetId) {
          await supabaseClient
            .from('live_streams')
            .update({ recording_asset_id: assetId })
            .eq('mux_live_id', liveStream.id);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', eventType);
    }

    // Mark webhook as processed
    await supabaseClient
      .from('mux_webhooks_log')
      .update({ processed: true })
      .eq('event_type', eventType)
      .eq('mux_asset_id', payload.data?.id || payload.object?.id)
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
