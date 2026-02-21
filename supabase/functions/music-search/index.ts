import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface YouTubeSearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

interface DeezerTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  preview_url: string;
  artwork_url: string;
  provider: string;
}

// Search YouTube Data API v3
async function searchYouTube(query: string, apiKey: string): Promise<YouTubeSearchResult[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=15&q=${encodeURIComponent(query + " music")}&key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.text();
    console.error("YouTube API error:", err);
    return [];
  }
  
  const data = await response.json();
  return (data.items || []).map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
  }));
}

// Parse YouTube title to extract artist and song name
function parseYouTubeTitle(title: string): { songTitle: string; artist: string } {
  // Clean common suffixes
  let clean = title
    .replace(/\s*\(official\s*(video|audio|music\s*video|lyrics?|visualizer)\)\s*/gi, '')
    .replace(/\s*\[official\s*(video|audio|music\s*video|lyrics?|visualizer)\]\s*/gi, '')
    .replace(/\s*\|\s*official\s*(video|audio|music\s*video|lyrics?)\s*/gi, '')
    .replace(/\s*-\s*official\s*(video|audio|music\s*video|lyrics?)\s*/gi, '')
    .replace(/\s*\(lyrics?\s*(video)?\)\s*/gi, '')
    .replace(/\s*\[lyrics?\s*(video)?\]\s*/gi, '')
    .replace(/\s*\(audio\)\s*/gi, '')
    .replace(/\s*\[audio\]\s*/gi, '')
    .replace(/\s*\(hd\)\s*/gi, '')
    .replace(/\s*\(4k\)\s*/gi, '')
    .replace(/\s*ft\.?\s*/gi, ' feat ')
    .trim();

  const separators = [' - ', ' – ', ' — ', ' | '];
  for (const sep of separators) {
    if (clean.includes(sep)) {
      const parts = clean.split(sep);
      if (parts.length >= 2) {
        return {
          artist: parts[0].trim(),
          songTitle: parts.slice(1).join(sep).trim(),
        };
      }
    }
  }

  return { songTitle: clean, artist: '' };
}

// Search Deezer to find matching audio preview - try multiple strategies
async function findDeezerMatch(songTitle: string, artist: string): Promise<DeezerTrack | null> {
  // Try multiple search queries for better matching
  const queries = [
    artist ? `${artist} ${songTitle}` : songTitle,
    songTitle, // title only
    artist ? `track:"${songTitle}" artist:"${artist}"` : null,
  ].filter(Boolean) as string[];

  for (const query of queries) {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const track = data.data[0];
        if (track.preview) {
          return {
            id: track.id.toString(),
            title: track.title,
            artist: track.artist?.name || "Unknown",
            duration: track.duration,
            preview_url: track.preview,
            artwork_url: track.album?.cover_medium || track.album?.cover || "",
            provider: "deezer",
          };
        }
      }
    } catch (e) {
      console.error("Deezer search failed:", e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type = "search", deezerId } = await req.json();
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");

    // Refresh a specific Deezer track's preview URL
    if (type === "refresh" && deezerId) {
      const response = await fetch(`https://api.deezer.com/track/${deezerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.preview) {
          return new Response(
            JSON.stringify({ previewUrl: data.preview }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      return new Response(
        JSON.stringify({ previewUrl: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trending - use Deezer charts
    if (type === "trending") {
      const url = "https://api.deezer.com/chart/0/tracks?limit=30";
      const response = await fetch(url);
      const data = await response.json();

      const tracks = (data.data || []).map((track: any) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist?.name || "Unknown",
        duration: track.duration,
        preview_url: track.preview,
        artwork_url: track.album?.cover_medium || track.album?.cover,
        provider: "deezer",
      }));

      return new Response(
        JSON.stringify({ tracks }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "search" && query) {
      // Hybrid: YouTube search + Deezer audio matching
      if (youtubeApiKey) {
        const ytResults = await searchYouTube(query, youtubeApiKey);
        
        // Cross-reference with Deezer for audio previews (parallel)
        const matchPromises = ytResults.map(async (yt) => {
          const parsed = parseYouTubeTitle(yt.title);
          const artist = parsed.artist || yt.channelTitle;
          const deezerMatch = await findDeezerMatch(parsed.songTitle, artist);
          
          if (deezerMatch) {
            return {
              ...deezerMatch,
              youtube_id: yt.id,
              youtube_thumbnail: yt.thumbnail,
            };
          }
          // Return YouTube-only result even without Deezer match
          return {
            id: `yt-${yt.id}`,
            title: parsed.songTitle || yt.title,
            artist: artist,
            duration: 0,
            preview_url: "",
            artwork_url: yt.thumbnail,
            provider: "youtube",
            youtube_id: yt.id,
            youtube_thumbnail: yt.thumbnail,
          };
        });

        const results = await Promise.all(matchPromises);
        const tracks = results.filter(Boolean);

        // If YouTube+Deezer hybrid yielded results, return them
        if (tracks.length > 0) {
          return new Response(
            JSON.stringify({ tracks, source: "hybrid" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fallback: Deezer-only search
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`;
      const response = await fetch(url);
      const data = await response.json();

      const tracks = (data.data || []).map((track: any) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist?.name || "Unknown",
        duration: track.duration,
        preview_url: track.preview,
        artwork_url: track.album?.cover_medium || track.album?.cover,
        provider: "deezer",
      }));

      return new Response(
        JSON.stringify({ tracks, source: "deezer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request parameters" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error: unknown) {
    console.error("Error in music-search:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to search music", details: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
