import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, artist } = await req.json();

    if (!title || !artist) {
      return new Response(
        JSON.stringify({ error: "Title and artist are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Clean artist name (remove " - " suffix patterns)
    const cleanArtist = artist.split(" - ")[0].trim();
    const cleanTitle = title.split("(")[0].split("[")[0].trim();

    // Try lrclib.net (free, no API key needed) with timeout
    const lrcUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    
    let lrcData = null;
    
    // Try with longer timeout and retry
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        
        const lrcResponse = await fetch(lrcUrl, {
          headers: { "User-Agent": "Lovable App v1.0" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (lrcResponse.ok) {
          lrcData = await lrcResponse.json();
          break;
        } else {
          await lrcResponse.text();
        }
      } catch (fetchErr) {
        console.warn(`lrclib fetch attempt ${attempt + 1} failed:`, fetchErr);
        if (attempt === 0) continue;
      }
    }

    if (lrcData && lrcData.length > 0) {
      const best = lrcData[0];
      const syncedLyrics = best.syncedLyrics || null;
      const plainLyrics = best.plainLyrics || null;

      let timedLines: { time: number; text: string }[] = [];
      if (syncedLyrics) {
        const lines = syncedLyrics.split("\n");
        for (const line of lines) {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
          if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const ms = parseInt(match[3].padEnd(3, '0'));
            const time = minutes * 60 + seconds + ms / 1000;
            const text = match[4].trim();
            if (text) {
              timedLines.push({ time, text });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          found: true,
          title: best.trackName || title,
          artist: best.artistName || artist,
          syncedLyrics: timedLines.length > 0 ? timedLines : null,
          plainLyrics: plainLyrics,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ found: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in lyrics-search:", error);
    // Return found: false instead of 500 to not break the UI
    return new Response(
      JSON.stringify({ found: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
