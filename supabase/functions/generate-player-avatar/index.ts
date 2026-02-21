import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { playerId, playerName, position, nation, type = 'player' } = await req.json();
    
    if (!playerId || !playerName) {
      return new Response(
        JSON.stringify({ error: 'playerId and playerName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating avatar for ${type}: ${playerName} (${playerId})`);

    // Create prompt based on type - generate realistic likeness of the actual person
    let prompt: string;
    if (type === 'coach') {
      prompt = `Create a hyper-realistic photograph of the famous football manager/coach "${playerName}" from ${nation} as they would look in 2026.
        This must look exactly like the real person "${playerName}" - their actual face, features, and appearance.
        Professional photo in coaching attire (suit or tracksuit), stadium sideline setting.
        Photojournalistic style, natural lighting, sharp focus on face.
        8K quality, extremely detailed facial features matching the real "${playerName}".
        No text, no watermarks, no artistic interpretation - pure photorealism.`;
    } else {
      prompt = `Create a hyper-realistic photograph of the famous football player "${playerName}" from ${nation} as they would look in 2026.
        This must look exactly like the real person "${playerName}" - their actual face, features, and appearance.
        Position: ${position}. Professional matchday photo in football kit.
        FIFA 26 cover style photo, stadium background, action or portrait pose.
        8K quality, extremely detailed facial features matching the real "${playerName}".
        No text, no watermarks, no artistic interpretation - pure photorealism of the actual player.`;
    }

    // Generate image using Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image data in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    console.log(`Image generated successfully for ${playerName}`);

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${type}s/${playerId}.png`;
    
    // Upload to storage bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('fm-avatars')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('fm-avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;
    console.log(`Avatar uploaded: ${avatarUrl}`);

    // Update the player/coach record with the new avatar URL
    const tableName = type === 'coach' ? 'fm_coaches' : 'fm_players';
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ avatar_url: avatarUrl })
      .eq('id', playerId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Failed to update ${type} avatar: ${updateError.message}`);
    }

    console.log(`Avatar URL saved to database for ${playerName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatarUrl,
        playerId,
        playerName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating avatar:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
