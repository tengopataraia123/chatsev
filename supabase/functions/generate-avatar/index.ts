import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { generation_id, prompt, style, source_image_url } = await req.json();

    if (!generation_id || !prompt) {
      throw new Error("generation_id and prompt are required");
    }

    console.log(`Generating avatar for ${generation_id} with style: ${style}`);

    // Build the image generation prompt
    const fullPrompt = `Create a professional profile avatar portrait in ${style} style. ${prompt}. The image should be a single person portrait with clean background, suitable for use as a social media profile picture. High quality, detailed, centered composition.`;

    // Build request body
    const requestBody: any = {
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ],
      modalities: ["image", "text"]
    };

    // If source image provided, include it for reference
    if (source_image_url) {
      requestBody.messages[0].content = [
        {
          type: "text",
          text: `Based on this reference photo, create a new avatar in ${style} style. ${prompt}. Make it a professional profile portrait.`
        },
        {
          type: "image_url",
          image_url: {
            url: source_image_url
          }
        }
      ];
    }

    // Call the Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        await supabase
          .from("ai_avatar_generations")
          .update({ status: "failed", error_message: "Rate limit exceeded. Please try again later." })
          .eq("id", generation_id);
        
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        await supabase
          .from("ai_avatar_generations")
          .update({ status: "failed", error_message: "Payment required for AI features." })
          .eq("id", generation_id);
        
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      throw new Error("No image was generated");
    }

    // Update the generation record with the result
    const { error: updateError } = await supabase
      .from("ai_avatar_generations")
      .update({
        generated_image_url: generatedImageUrl,
        status: "completed"
      })
      .eq("id", generation_id);

    if (updateError) {
      console.error("Error updating generation:", updateError);
      throw updateError;
    }

    console.log(`Avatar generated successfully for ${generation_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        image_url: generatedImageUrl 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating avatar:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to generate avatar" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
