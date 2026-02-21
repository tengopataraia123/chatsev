import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Root account user IDs - these accounts have absolute protection
const ROOT_USER_IDS = [
  'b067dbd7-1235-407f-8184-e2f6aef034d3', // CHEGE
  '204eb697-6b0a-453a-beee-d32e0ab72bfd', // PIKASO
];

// Check if user is a root account
const isRootAccount = (userId: string): boolean => {
  return ROOT_USER_IDS.includes(userId);
};

// Check if actor has root controls permission
const hasRootControls = (userId: string): boolean => {
  return ROOT_USER_IDS.includes(userId);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("admin-change-password: Starting request");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      throw new Error("Missing environment variables");
    }

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify the user is authenticated and is a super admin
    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Check if user is super admin
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    console.log("Role check:", roleData, roleError);

    if (roleError || roleData?.role !== "super_admin") {
      console.error("Not super admin:", roleData?.role);
      return new Response(
        JSON.stringify({ error: "Only super admins can change user passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { userId, newPassword } = await req.json();
    console.log("Changing password for user:", userId);

    if (!userId || !newPassword) {
      console.error("Missing userId or newPassword");
      return new Response(
        JSON.stringify({ error: "Missing userId or newPassword" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user is a super admin
    const { data: targetRoleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    // ROOT ACCOUNT PROTECTION: Only root accounts can modify root accounts
    if (isRootAccount(userId)) {
      if (!hasRootControls(user.id)) {
        console.error("Cannot change password of root account - actor is not root");
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Root account modification allowed - actor is also root");
    }

    // SUPER ADMIN PROTECTION: Only root accounts can modify super admins
    if (targetRoleData?.role === "super_admin") {
      if (!hasRootControls(user.id)) {
        console.error("Cannot change password of super admin - actor is not root");
        return new Response(
          JSON.stringify({ error: "Cannot change password of another super admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Super admin modification allowed - actor has root controls");
    }

    // Update user password using admin API
    console.log("Updating password via admin API...");
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Password updated successfully:", updateData?.user?.id);

    // Update password_changed_at in profiles
    await adminClient
      .from("profiles")
      .update({ password_changed_at: new Date().toISOString() })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
