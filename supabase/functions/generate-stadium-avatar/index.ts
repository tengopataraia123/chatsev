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
    const { stadiumId, stadiumName, city, country } = await req.json();
    
    if (!stadiumId || !stadiumName) {
      return new Response(
        JSON.stringify({ error: 'stadiumId and stadiumName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating stadium avatar for: ${stadiumName} (${stadiumId})`);

    // Create a detailed prompt for the stadium - night aerial view with illumination
    const prompt = `Create a hyper-realistic aerial photograph of the famous football stadium "${stadiumName}" located in ${city}, ${country}.
      This must be the REAL "${stadiumName}" stadium - showing its actual architecture and design.
      
      Key requirements:
      - Night time atmosphere with dramatic stadium lighting
      - Bird's eye / aerial view from above at 45 degree angle
      - Stadium interior fully illuminated with bright green pitch visible
      - Stadium exterior structure and surrounding area visible
      - The stadium name "${stadiumName}" should appear as an elegant white text overlay at the bottom
      - Atmospheric night sky with city lights in the background
      - Professional sports photography style
      - 8K quality, cinematic lighting, photorealistic
      - No watermarks except the stadium name text
      
      The image should capture the grandeur and iconic nature of "${stadiumName}" at night during a match.`;

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

    console.log(`Image generated successfully for stadium: ${stadiumName}`);

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `stadiums/${stadiumId}.png`;
    
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
      throw new Error(`Failed to upload stadium avatar: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('fm-avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;
    console.log(`Stadium avatar uploaded: ${avatarUrl}`);

    // Update the stadium record with the new image URL
    const { error: updateError } = await supabase
      .from('fm_stadiums')
      .update({ image_url: avatarUrl })
      .eq('id', stadiumId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Failed to update stadium image: ${updateError.message}`);
    }

    console.log(`Stadium image URL saved to database for ${stadiumName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: avatarUrl,
        stadiumId,
        stadiumName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating stadium avatar:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
