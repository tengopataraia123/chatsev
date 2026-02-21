import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get the authorization header to verify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the token and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;
    console.log("Authenticated user:", userId);

    // Create admin client for role check and statistics
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has admin role - using service role to bypass RLS
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    console.log("Role check result:", { roleData, roleError });

    // Allow any admin role (super_admin, admin, moderator)
    const adminRoles = ["super_admin", "admin", "moderator"];
    if (roleError || !roleData || !adminRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Access denied. Admin role required.", debug: { roleData, userId } }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User has admin role:", roleData.role);

    // Calculate statistics using service role (bypasses RLS)
    const now = new Date();
    
    // Calculate Georgian midnight (UTC+4) for daily stats
    const georgianOffset = 4 * 60 * 60 * 1000; // 4 hours in ms
    const nowInGeorgia = new Date(now.getTime() + georgianOffset);
    const georgianMidnight = new Date(nowInGeorgia);
    georgianMidnight.setUTCHours(0, 0, 0, 0);
    const todayStartUTC = new Date(georgianMidnight.getTime() - georgianOffset);
    
    // 1. Total registered users
    const { count: totalUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 2. Users registered in the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { count: usersLast30Days } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString());

    // 3. Users registered today (Georgian time - from midnight to now)
    const { count: usersToday } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartUTC.toISOString());

    // 4. Visitors in the last 24 hours (users with last_seen in last 24h)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { count: visitorsLast24Hours } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_seen", twentyFourHoursAgo.toISOString());

    // 5. Online users in the last 10 minutes
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const { count: onlineUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_seen", tenMinutesAgo.toISOString());

    const statistics = {
      totalUsers: totalUsers || 0,
      usersLast30Days: usersLast30Days || 0,
      usersToday: usersToday || 0,
      visitorsLast24Hours: visitorsLast24Hours || 0,
      onlineUsers: onlineUsers || 0,
      calculatedAt: now.toISOString(),
      georgianDate: nowInGeorgia.toISOString().split('T')[0]
    };

    console.log("Statistics calculated:", statistics);

    return new Response(
      JSON.stringify(statistics),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error calculating statistics:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
