import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is super_admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if caller is super_admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Super admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all profiles with login_email
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("user_id, username, login_email")
      .not("login_email", "is", null);

    if (profilesError) throw profilesError;

    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 10000,
    });

    if (authError) throw authError;

    const authUserMap = new Map<string, string>();
    for (const au of authUsers) {
      authUserMap.set(au.id, au.email || "");
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const details: Array<{ user_id: string; username: string; old_auth: string; new_auth: string; status: string }> = [];

    for (const profile of profiles || []) {
      const authEmail = authUserMap.get(profile.user_id);
      if (!authEmail) continue;

      // Check if they match (case-insensitive)
      if (authEmail.toLowerCase() === profile.login_email.toLowerCase()) {
        skipped++;
        continue;
      }

      // Mismatch found - update auth email
      console.log(`[sync] Updating ${profile.user_id} (${profile.username}): auth=${authEmail} -> ${profile.login_email}`);
      
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        profile.user_id,
        { email: profile.login_email, email_confirm: true }
      );

      if (updateError) {
        console.error(`[sync] Failed for ${profile.user_id}:`, updateError.message);
        failed++;
        details.push({
          user_id: profile.user_id,
          username: profile.username,
          old_auth: authEmail,
          new_auth: profile.login_email,
          status: `FAILED: ${updateError.message}`,
        });
      } else {
        updated++;
        details.push({
          user_id: profile.user_id,
          username: profile.username,
          old_auth: authEmail,
          new_auth: profile.login_email,
          status: "OK",
        });
      }
    }

    console.log(`[sync] Done: updated=${updated}, skipped=${skipped}, failed=${failed}`);

    return new Response(JSON.stringify({ updated, skipped, failed, details }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-auth-emails error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
