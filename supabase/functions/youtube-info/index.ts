import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  // Clean URL - remove query params after video ID
  let cleanUrl = url;
  
  // Handle live URLs: youtube.com/live/VIDEO_ID?si=xxx
  const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) return liveMatch[1];
  
  // Handle shorts URLs
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];
  
  // Handle standard watch URLs
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  
  // Handle embed URLs
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  
  // Handle youtu.be short URLs
  const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortUrlMatch) return shortUrlMatch[1];
  
  // Handle raw video ID
  const rawMatch = url.match(/^([a-zA-Z0-9_-]{11})$/);
  if (rawMatch) return rawMatch[1];
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = extractVideoId(url);
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try multiple sources for video info
    let data = null;
    
    // Try YouTube oEmbed API first
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    try {
      const response = await fetch(oembedUrl);
      if (response.ok) {
        data = await response.json();
      }
    } catch (e) {
      console.log('YouTube oEmbed failed:', e);
    }
    
    // Fallback to noembed.com
    if (!data) {
      try {
        const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(noembedUrl);
        if (response.ok) {
          data = await response.json();
        }
      } catch (e) {
        console.log('Noembed failed:', e);
      }
    }
    
    // If all API calls failed, return basic info with video ID
    if (!data) {
      return new Response(
        JSON.stringify({
          videoId,
          title: `YouTube Video`,
          artist: '',
          channelName: '',
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          originalTitle: `YouTube Video (${videoId})`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse title to extract song name and artist
    let title = data.title || "";
    let artist = data.author_name || "";
    
    // Common patterns: "Artist - Song", "Song | Artist", "Song by Artist"
    const separators = [' - ', ' – ', ' — ', ' | ', ' by '];
    
    for (const sep of separators) {
      if (title.includes(sep)) {
        const parts = title.split(sep);
        if (parts.length >= 2) {
          // Usually format is "Artist - Song" or "Song - Artist"
          // Try to be smart about it
          if (sep === ' by ') {
            artist = parts[1].trim();
            title = parts[0].trim();
          } else {
            // Assume "Artist - Song" format
            artist = parts[0].trim();
            title = parts.slice(1).join(sep).trim();
          }
          break;
        }
      }
    }
    
    // Clean up common suffixes
    const cleanupPatterns = [
      /\s*\(official\s*(video|audio|music\s*video|lyrics?|visualizer)\)\s*/gi,
      /\s*\[official\s*(video|audio|music\s*video|lyrics?|visualizer)\]\s*/gi,
      /\s*\|\s*official\s*(video|audio|music\s*video|lyrics?)\s*/gi,
      /\s*-\s*official\s*(video|audio|music\s*video|lyrics?)\s*/gi,
      /\s*\(lyrics?\s*(video)?\)\s*/gi,
      /\s*\[lyrics?\s*(video)?\]\s*/gi,
      /\s*\(audio\)\s*/gi,
      /\s*\[audio\]\s*/gi,
      /\s*\(hd\)\s*/gi,
      /\s*\(4k\)\s*/gi,
    ];
    
    for (const pattern of cleanupPatterns) {
      title = title.replace(pattern, '');
      artist = artist.replace(pattern, '');
    }

    return new Response(
      JSON.stringify({
        videoId,
        title: title.trim(),
        artist: artist.trim(),
        channelName: data.author_name,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        originalTitle: data.title
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});