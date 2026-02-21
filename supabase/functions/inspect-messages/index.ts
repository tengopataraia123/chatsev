import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CRITICAL: Only these super admins can use the inspector
const ALLOWED_INSPECTORS = ['CHEGE', 'C H E G E', 'P ი კ ა S ო', 'P ი კ ა S o', 'პიკასო'];
// CHEGE's messages are protected from ALL other inspectors
const PROTECTED_USERNAMES = ['CHEGE', 'C H E G E'];

interface InspectorRequest {
  action: 'verify' | 'get_conversations' | 'get_messages';
  target_user_id?: string;
  conversation_id?: string;
}

// Normalize username for comparison (remove spaces, lowercase)
function normalizeUsername(username: string): string {
  return username.replace(/\s+/g, '').toLowerCase();
}

function isAllowedInspector(username: string): boolean {
  const normalized = normalizeUsername(username);
  return ALLOWED_INSPECTORS.some(allowed => normalizeUsername(allowed) === normalized);
}

function isProtectedUsername(username: string): boolean {
  const normalized = normalizeUsername(username);
  return PROTECTED_USERNAMES.some(protected_name => normalizeUsername(protected_name) === normalized);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token for auth check
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client for admin operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get inspector's profile and role
    const { data: inspectorProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    // SECURITY CHECK 1: Must be super_admin
    if (roleData?.role !== 'super_admin') {
      console.log(`[SECURITY] Non-super_admin attempted inspect: ${inspectorProfile?.username}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY CHECK 2: Must be in allowed list
    const inspectorUsername = inspectorProfile?.username;
    if (!inspectorUsername || !isAllowedInspector(inspectorUsername)) {
      console.log(`[SECURITY] Unauthorized super_admin attempted inspect: ${inspectorUsername}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Get CHEGE's user_id for reliable comparison
    const { data: protectedUsers } = await supabase
      .from('profiles')
      .select('user_id, username')
      .or(`username.eq.CHEGE,username.eq.C H E G E`);
    
    const protectedUserIds = new Set(protectedUsers?.map(p => p.user_id) || []);
    const isInspectorProtected = isProtectedUsername(inspectorUsername);

    console.log(`[DEBUG] Inspector: ${inspectorUsername}, Is inspector protected (CHEGE): ${isInspectorProtected}`);

    const body: InspectorRequest = await req.json();
    const { action, target_user_id, conversation_id } = body;

    // For verification
    if (action === 'verify') {
      return new Response(
        JSON.stringify({ 
          authorized: true, 
          inspector: inspectorUsername,
          can_view_protected: isInspectorProtected
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'target_user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY CHECK 3: Block viewing CHEGE's inbox directly (by user_id)
    if (protectedUserIds.has(target_user_id) && !isInspectorProtected) {
      console.log(`[SECURITY] ${inspectorUsername} attempted to view protected user's inbox directly`);
      return new Response(
        JSON.stringify({ error: 'დაცული მომხმარებელი - წვდომა აკრძალულია' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user's profile
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', target_user_id)
      .single();

    if (action === 'get_conversations') {
      // Fetch ALL conversations for target user - no limit
      const { data: conversations, error: convError } = await supabase
        .from('messenger_conversations')
        .select('*')
        .or(`user1_id.eq.${target_user_id},user2_id.eq.${target_user_id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(10000); // Ensure we get all conversations

      if (convError) {
        console.error('[ERROR] Conversations fetch error:', convError);
        throw convError;
      }

      if (!conversations || conversations.length === 0) {
        return new Response(
          JSON.stringify({ conversations: [], target_username: targetProfile?.username }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // SECURITY CHECK 4: Filter out conversations involving CHEGE (by user_id)
      const filteredConversations = !isInspectorProtected
        ? conversations.filter(conv => {
            const isUser1Protected = protectedUserIds.has(conv.user1_id);
            const isUser2Protected = protectedUserIds.has(conv.user2_id);
            
            if (isUser1Protected || isUser2Protected) {
              console.log(`[SECURITY] Filtering out conversation ${conv.id} - involves protected user`);
              return false;
            }
            return true;
          })
        : conversations;

      // Get other user IDs from filtered conversations
      const otherUserIds = filteredConversations.map(c => 
        c.user1_id === target_user_id ? c.user2_id : c.user1_id
      ).filter(id => id);

      console.log(`[DEBUG] Found ${filteredConversations.length} conversations, ${otherUserIds.length} other user IDs`);

      // Get profiles for other users
      const profileMap = new Map();
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, last_seen')
          .in('user_id', otherUserIds);
        
        if (profiles) {
          for (const p of profiles) {
            profileMap.set(p.user_id, p);
          }
        }
      }

      // Get message counts per conversation
      const conversationIds = filteredConversations.map(c => c.id);
      const { data: messageCounts } = await supabase
        .from('messenger_messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds);

      const countMap = new Map<string, number>();
      messageCounts?.forEach(m => {
        countMap.set(m.conversation_id, (countMap.get(m.conversation_id) || 0) + 1);
      });

      // Fetch deletion records for all conversations
      const { data: deletionRecords } = await supabase
        .from('messenger_conversation_deletions')
        .select('conversation_id, user_id, deleted_at')
        .in('conversation_id', conversationIds);

      // Map: convId -> array of { user_id, deleted_at }
      const deletionMap = new Map<string, { user_id: string; deleted_at: string }[]>();
      deletionRecords?.forEach(d => {
        const existing = deletionMap.get(d.conversation_id) || [];
        existing.push({ user_id: d.user_id, deleted_at: d.deleted_at });
        deletionMap.set(d.conversation_id, existing);
      });

      // Build response
      const conversationsWithDetails = filteredConversations.map(conv => {
        const otherUserId = conv.user1_id === target_user_id ? conv.user2_id : conv.user1_id;
        const otherProfile = profileMap.get(otherUserId);
        const deletions = deletionMap.get(conv.id) || [];
        // Check if target user or other user deleted this conversation
        const deletedByTarget = deletions.find(d => d.user_id === target_user_id);
        const deletedByOther = deletions.find(d => d.user_id === otherUserId);

        return {
          id: conv.id,
          other_user: {
            user_id: otherUserId,
            username: otherProfile?.username || 'Unknown',
            avatar_url: otherProfile?.avatar_url || null,
            last_seen: otherProfile?.last_seen || null,
          },
          last_message: conv.last_message_preview,
          last_message_time: conv.last_message_at || conv.updated_at,
          message_count: countMap.get(conv.id) || 0,
          is_deleted_by_target: !!deletedByTarget,
          deleted_by_target_at: deletedByTarget?.deleted_at || null,
          is_deleted_by_other: !!deletedByOther,
          deleted_by_other_at: deletedByOther?.deleted_at || null,
        };
      });

      return new Response(
        JSON.stringify({ 
          conversations: conversationsWithDetails,
          target_username: targetProfile?.username
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_messages') {
      if (!conversation_id) {
        return new Response(
          JSON.stringify({ error: 'conversation_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify conversation belongs to target user
      const { data: conv } = await supabase
        .from('messenger_conversations')
        .select('*')
        .eq('id', conversation_id)
        .single();

      if (!conv || (conv.user1_id !== target_user_id && conv.user2_id !== target_user_id)) {
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // SECURITY CHECK 5: Block if conversation involves CHEGE (by user_id)
      if (!isInspectorProtected) {
        if (protectedUserIds.has(conv.user1_id) || protectedUserIds.has(conv.user2_id)) {
          console.log(`[SECURITY] ${inspectorUsername} attempted to view conversation involving protected user`);
          return new Response(
            JSON.stringify({ error: 'დაცული მომხმარებელი - წვდომა აკრძალულია' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const otherUserId = conv.user1_id === target_user_id ? conv.user2_id : conv.user1_id;
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', otherUserId)
        .single();

      // Fetch ALL messages from messenger_messages - NO read status update!
      const { data: messages, error: msgError } = await supabase
        .from('messenger_messages')
        .select('*')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })
        .limit(50000); // Ensure we get all messages

      if (msgError) {
        console.error('[ERROR] Messages fetch error:', msgError);
        throw msgError;
      }

      // Get sender profiles
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', senderIds);

      const senderMap = new Map(senderProfiles?.map(p => [p.user_id, p]) || []);

      const messagesWithSender = messages?.map(msg => ({
        id: msg.id,
        content: msg.is_deleted ? (msg.original_content || msg.content) : msg.content,
        image_urls: msg.is_deleted ? (msg.original_image_urls || msg.image_urls) : msg.image_urls,
        video_url: msg.is_deleted ? (msg.original_video_url || msg.video_url) : msg.video_url,
        voice_url: msg.is_deleted ? (msg.original_voice_url || msg.voice_url) : msg.voice_url,
        gif_id: msg.is_deleted ? (msg.original_gif_id || msg.gif_id) : msg.gif_id,
        sender_id: msg.sender_id,
        sender_username: senderMap.get(msg.sender_id)?.username || 'Unknown',
        sender_avatar: senderMap.get(msg.sender_id)?.avatar_url || null,
        created_at: msg.created_at,
        is_deleted: msg.is_deleted,
        deleted_at: msg.deleted_at,
        deleted_for_everyone: msg.deleted_for_everyone,
      })) || [];

      return new Response(
        JSON.stringify({ 
          messages: messagesWithSender,
          conversation: {
            id: conv.id,
            other_user: {
              user_id: otherUserId,
              username: otherProfile?.username || 'Unknown',
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Inspect messages error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
