import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const adminUserId = claimsData.user.id;
    console.log("Authenticated admin user:", adminUserId);

    // Create admin client for role check and deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has super_admin role - ONLY super_admin can delete users
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .maybeSingle();

    console.log("Role check result:", { roleData, roleError });

    if (roleError || !roleData || roleData.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Access denied. Super admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the target user ID from request body
    const { targetUserId } = await req.json();
    
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "Target user ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (targetUserId === adminUserId) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user is also super_admin (cannot delete other super admins)
    const { data: targetRoleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (targetRoleData?.role === "super_admin") {
      return new Response(
        JSON.stringify({ error: "Cannot delete another super admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user info before deletion for logging
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("user_id", targetUserId)
      .single();

    console.log("Deleting user and ALL their data:", targetUserId, targetProfile?.username);

    // ========== COMPLETE USER DATA DELETION ==========
    // Delete ALL traces of the user from every table
    
    // 1. Delete posts and related content
    await supabaseAdmin.from("post_likes").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("post_bookmarks").delete().eq("user_id", targetUserId);
    
    // Get all post IDs by this user to delete related data
    const { data: userPosts } = await supabaseAdmin
      .from("posts")
      .select("id")
      .eq("user_id", targetUserId);
    
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map(p => p.id);
      // Delete likes/bookmarks on user's posts
      await supabaseAdmin.from("post_likes").delete().in("post_id", postIds);
      await supabaseAdmin.from("post_bookmarks").delete().in("post_id", postIds);
      // Delete comments on user's posts
      const { data: postComments } = await supabaseAdmin
        .from("post_comments")
        .select("id")
        .in("post_id", postIds);
      if (postComments && postComments.length > 0) {
        const commentIds = postComments.map(c => c.id);
        await supabaseAdmin.from("comment_likes").delete().in("comment_id", commentIds);
        await supabaseAdmin.from("comment_replies").delete().in("comment_id", commentIds);
      }
      await supabaseAdmin.from("post_comments").delete().in("post_id", postIds);
    }
    
    // Delete user's comments and replies
    const { data: userComments } = await supabaseAdmin
      .from("post_comments")
      .select("id")
      .eq("user_id", targetUserId);
    if (userComments && userComments.length > 0) {
      const commentIds = userComments.map(c => c.id);
      await supabaseAdmin.from("comment_likes").delete().in("comment_id", commentIds);
      await supabaseAdmin.from("comment_replies").delete().in("comment_id", commentIds);
    }
    await supabaseAdmin.from("comment_replies").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("post_comments").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("posts").delete().eq("user_id", targetUserId);

    // 2. Delete stories
    await supabaseAdmin.from("story_views").delete().eq("viewer_id", targetUserId);
    const { data: userStories } = await supabaseAdmin
      .from("stories")
      .select("id")
      .eq("user_id", targetUserId);
    if (userStories && userStories.length > 0) {
      const storyIds = userStories.map(s => s.id);
      await supabaseAdmin.from("story_views").delete().in("story_id", storyIds);
    }
    await supabaseAdmin.from("stories").delete().eq("user_id", targetUserId);

    // 3. Delete private messages and conversations (legacy system)
    await supabaseAdmin.from("messages").delete().eq("sender_id", targetUserId);
    await supabaseAdmin.from("messages").delete().eq("receiver_id", targetUserId);
    await supabaseAdmin.from("private_messages").delete().eq("sender_id", targetUserId);
    await supabaseAdmin.from("private_messages").delete().eq("receiver_id", targetUserId);
    await supabaseAdmin.from("conversation_user_state").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("conversation_call_settings").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("conversations").delete().eq("user1_id", targetUserId);
    await supabaseAdmin.from("conversations").delete().eq("user2_id", targetUserId);

    // 3b. Delete messenger system data
    await supabaseAdmin.from("messenger_reactions").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("messenger_typing").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("messenger_preferences").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("messenger_conversation_deletions").delete().eq("user_id", targetUserId);
    
    // Get messenger conversations involving this user
    const { data: messengerConvs1 } = await supabaseAdmin
      .from("messenger_conversations")
      .select("id")
      .eq("user1_id", targetUserId);
    const { data: messengerConvs2 } = await supabaseAdmin
      .from("messenger_conversations")
      .select("id")
      .eq("user2_id", targetUserId);
    const messengerConvIds = [
      ...(messengerConvs1 || []).map(c => c.id),
      ...(messengerConvs2 || []).map(c => c.id)
    ];
    if (messengerConvIds.length > 0) {
      await supabaseAdmin.from("messenger_messages").delete().in("conversation_id", messengerConvIds);
      await supabaseAdmin.from("messenger_conversation_deletions").delete().in("conversation_id", messengerConvIds);
    }
    await supabaseAdmin.from("messenger_messages").delete().eq("sender_id", targetUserId);
    await supabaseAdmin.from("messenger_conversations").delete().eq("user1_id", targetUserId);
    await supabaseAdmin.from("messenger_conversations").delete().eq("user2_id", targetUserId);

    // 3c. Delete messenger group data
    await supabaseAdmin.from("messenger_group_messages").delete().eq("sender_id", targetUserId);
    await supabaseAdmin.from("messenger_group_poll_votes").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("messenger_group_reactions").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("messenger_group_reads").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("messenger_group_requests").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("messenger_group_typing").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("messenger_group_members").delete().eq("user_id", targetUserId);

    // 4. Delete chat room messages
    await supabaseAdmin.from("chat_messages").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dj_room_messages").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("emigrants_room_messages").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dj_room_presence").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("emigrants_room_presence").delete().eq("user_id", targetUserId);

    // 5. Delete social connections
    await supabaseAdmin.from("followers").delete().eq("follower_id", targetUserId);
    await supabaseAdmin.from("followers").delete().eq("following_id", targetUserId);
    await supabaseAdmin.from("friendships").delete().eq("requester_id", targetUserId);
    await supabaseAdmin.from("friendships").delete().eq("addressee_id", targetUserId);
    await supabaseAdmin.from("game_friends").delete().eq("sender_id", targetUserId);
    await supabaseAdmin.from("game_friends").delete().eq("recipient_id", targetUserId);
    await supabaseAdmin.from("user_blocks").delete().eq("blocker_id", targetUserId);
    await supabaseAdmin.from("user_blocks").delete().eq("blocked_id", targetUserId);

    // 6. Delete dating data
    await supabaseAdmin.from("dating_messages").delete().eq("sender_id", targetUserId);
    await supabaseAdmin.from("dating_typing_status").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dating_matches").delete().eq("user1_id", targetUserId);
    await supabaseAdmin.from("dating_matches").delete().eq("user2_id", targetUserId);
    await supabaseAdmin.from("dating_likes").delete().eq("liker_id", targetUserId);
    await supabaseAdmin.from("dating_likes").delete().eq("liked_id", targetUserId);
    await supabaseAdmin.from("dating_swipes").delete().eq("swiper_id", targetUserId);
    await supabaseAdmin.from("dating_swipes").delete().eq("swiped_id", targetUserId);
    await supabaseAdmin.from("dating_blocks").delete().eq("blocker_id", targetUserId);
    await supabaseAdmin.from("dating_blocks").delete().eq("blocked_id", targetUserId);
    await supabaseAdmin.from("dating_reports").delete().eq("reporter_id", targetUserId);
    await supabaseAdmin.from("dating_reports").delete().eq("reported_id", targetUserId);
    await supabaseAdmin.from("dating_profile_views").delete().eq("viewer_id", targetUserId);
    await supabaseAdmin.from("dating_profile_views").delete().eq("viewed_id", targetUserId);
    await supabaseAdmin.from("dating_daily_picks").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dating_daily_picks").delete().eq("picked_user_id", targetUserId);
    await supabaseAdmin.from("dating_super_likes").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dating_super_likes").delete().eq("target_id", targetUserId);
    await supabaseAdmin.from("dating_rewind_history").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dating_verifications").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dating_profiles").delete().eq("user_id", targetUserId);

    // 7. Delete blog data
    const { data: userBlogs } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .eq("user_id", targetUserId);
    if (userBlogs && userBlogs.length > 0) {
      const blogIds = userBlogs.map(b => b.id);
      await supabaseAdmin.from("blog_reactions").delete().in("blog_id", blogIds);
      await supabaseAdmin.from("blog_bookmarks").delete().in("blog_id", blogIds);
      await supabaseAdmin.from("blog_views").delete().in("blog_id", blogIds);
      await supabaseAdmin.from("blog_shares").delete().in("blog_id", blogIds);
      await supabaseAdmin.from("blog_reports").delete().in("blog_id", blogIds);
      const { data: blogComments } = await supabaseAdmin
        .from("blog_comments")
        .select("id")
        .in("blog_id", blogIds);
      if (blogComments && blogComments.length > 0) {
        await supabaseAdmin.from("blog_comment_reactions").delete().in("comment_id", blogComments.map(c => c.id));
      }
      await supabaseAdmin.from("blog_comments").delete().in("blog_id", blogIds);
    }
    await supabaseAdmin.from("blog_reactions").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("blog_bookmarks").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("blog_views").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("blog_shares").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("blog_reports").delete().eq("reporter_id", targetUserId);
    await supabaseAdmin.from("blog_comment_reactions").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("blog_comments").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("blog_posts").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("blogs").delete().eq("user_id", targetUserId);

    // 8. Delete notifications
    await supabaseAdmin.from("notifications").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("notifications").delete().eq("actor_id", targetUserId);

    // 9. Delete activity data
    await supabaseAdmin.from("activity_likes").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("activity_comments").delete().eq("user_id", targetUserId);

    // 10. Delete calls data
    await supabaseAdmin.from("call_signals").delete().eq("from_user_id", targetUserId);
    await supabaseAdmin.from("call_signals").delete().eq("to_user_id", targetUserId);
    await supabaseAdmin.from("calls").delete().eq("caller_id", targetUserId);
    await supabaseAdmin.from("calls").delete().eq("receiver_id", targetUserId);

    // 11. Delete forum data
    await supabaseAdmin.from("forum_posts").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("forums").delete().eq("user_id", targetUserId);

    // 12. Delete reports about this user
    await supabaseAdmin.from("reports").delete().eq("reporter_id", targetUserId);
    await supabaseAdmin.from("reports").delete().eq("reported_user_id", targetUserId);

    // 13. Delete device and analytics data
    await supabaseAdmin.from("device_accounts").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("analytics_events").delete().eq("user_id", targetUserId);

    // 14. Delete other user data
    await supabaseAdmin.from("username_history").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("bio_history").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("user_badges").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("user_settings").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("user_sessions").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dismissed_friend_suggestions").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("dismissed_friend_suggestions").delete().eq("dismissed_user_id", targetUserId);
    await supabaseAdmin.from("ad_violations").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("bets").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("admin_ratings").delete().eq("admin_id", targetUserId);

    // 14b. Delete anonymous questions
    await supabaseAdmin.from("anonymous_question_likes").delete().eq("user_id", targetUserId);
    const { data: userQuestions } = await supabaseAdmin
      .from("anonymous_questions")
      .select("id")
      .or(`sender_id.eq.${targetUserId},recipient_id.eq.${targetUserId}`);
    if (userQuestions && userQuestions.length > 0) {
      await supabaseAdmin.from("anonymous_question_likes").delete().in("question_id", userQuestions.map(q => q.id));
    }
    await supabaseAdmin.from("anonymous_questions").delete().eq("sender_id", targetUserId);
    await supabaseAdmin.from("anonymous_questions").delete().eq("recipient_id", targetUserId);

    // 14c. Delete confessions
    await supabaseAdmin.from("confession_reactions").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("confession_comments").delete().eq("user_id", targetUserId);
    const { data: userConfessions } = await supabaseAdmin
      .from("confessions")
      .select("id")
      .eq("user_id", targetUserId);
    if (userConfessions && userConfessions.length > 0) {
      const confIds = userConfessions.map(c => c.id);
      await supabaseAdmin.from("confession_reactions").delete().in("confession_id", confIds);
      await supabaseAdmin.from("confession_comments").delete().in("confession_id", confIds);
    }
    await supabaseAdmin.from("confessions").delete().eq("user_id", targetUserId);

    // 14d. Delete close friends
    await supabaseAdmin.from("close_friends").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("close_friends").delete().eq("friend_id", targetUserId);

    // 14e. Delete announcements user state
    await supabaseAdmin.from("announcement_user_state").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("announcement_comment_reactions").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("announcement_comments").delete().eq("user_id", targetUserId);

    // 14f. Delete AI data
    await supabaseAdmin.from("ai_chat_messages").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("ai_avatar_generations").delete().eq("user_id", targetUserId);

    // 14g. Delete activity points
    await supabaseAdmin.from("activity_points_log").delete().eq("user_id", targetUserId);

    // 14h. Delete challenge data
    await supabaseAdmin.from("challenge_votes").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("challenge_submissions").delete().eq("user_id", targetUserId);

    // 15. Delete DJ room data
    await supabaseAdmin.from("dj_room_requests").delete().eq("from_user_id", targetUserId);
    await supabaseAdmin.from("dj_room_queue").delete().eq("added_by", targetUserId);
    await supabaseAdmin.from("dj_room_tracks").delete().eq("created_by", targetUserId);
    await supabaseAdmin.from("dj_room_playlist").delete().eq("added_by", targetUserId);
    await supabaseAdmin.from("dj_rooms").delete().eq("owner_id", targetUserId);

    // 16. Delete profile (must be before auth user deletion)
    await supabaseAdmin.from("profiles").delete().eq("user_id", targetUserId);

    // ========== END OF DATA DELETION ==========

    // Finally delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete user", details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the admin action
    await supabaseAdmin
      .from("admin_action_logs")
      .insert({
        admin_id: adminUserId,
        admin_role: "super_admin",
        action_type: "delete",
        action_category: "user",
        target_user_id: targetUserId,
        description: `მომხმარებლის სრული წაშლა: ${targetProfile?.username || targetUserId}`,
        metadata: { deleted_username: targetProfile?.username, complete_deletion: true }
      });

    console.log("User and ALL data deleted successfully:", targetUserId);

    return new Response(
      JSON.stringify({ success: true, message: "User and all data deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});