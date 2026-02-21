import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "არ არის ავტორიზებული" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "არავალიდური სესია" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { newEmail, userId } = await req.json();

    if (!newEmail) {
      return new Response(JSON.stringify({ error: "ახალი email აუცილებელია" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Users can only update their own email, unless they are admin
    const targetUserId = userId || user.id;
    
    if (targetUserId !== user.id) {
      // Check if caller is admin
      const { data: callerProfile } = await userClient
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const adminRoles = ["owner", "admin", "super_admin", "head_admin"];
      if (!callerProfile || !adminRoles.includes(callerProfile.role)) {
        return new Response(JSON.stringify({ error: "არ გაქვთ უფლება" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Use admin API to update email WITHOUT confirmation
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      { email: newEmail, email_confirm: true }
    );

    if (updateError) {
      console.error("Error updating auth email:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Auth email updated for user ${targetUserId} to ${newEmail}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("update-auth-email error:", error);
    return new Response(JSON.stringify({ error: "შიდა შეცდომა" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
