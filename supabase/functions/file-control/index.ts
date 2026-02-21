import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Only these two users can access File Control (by user_id for security)
const ALLOWED_USER_IDS = [
  "b067dbd7-1235-407f-8184-e2f6aef034d3", // CHEGE
  "204eb697-6b0a-453a-beee-d32e0ab72bfd", // PIKASO
];

// CHEGE's user_id - exclude their files for everyone
const CHEGE_USER_ID = "b067dbd7-1235-407f-8184-e2f6aef034d3";

serve(async (req) => {
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
    
    // Verify the token and get user
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

    // Check if user_id is in allowed list (more secure than username check)
    if (!ALLOWED_USER_IDS.includes(userId)) {
      console.log("Access denied for user:", userId);
      return new Response(
        JSON.stringify({ error: "Access denied. You do not have permission to view File Control." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Access granted for:", userId);

    // Create admin client for data access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // Body parsing failed
      }
    }

    // Handle delete action
    if (body.action === 'delete' && body.fileUrl) {
      console.log("Delete request for file:", body.fileUrl);
      
      const fileUrl = body.fileUrl as string;
      let deleted = false;

      // Delete from storage if it's a supabase storage URL
      if (fileUrl.includes('supabase.co/storage') || fileUrl.includes('/storage/v1/object/')) {
        try {
          const urlParts = fileUrl.split('/storage/v1/object/public/');
          if (urlParts[1]) {
            const [bucket, ...pathParts] = urlParts[1].split('/');
            const filePath = pathParts.join('/');
            
            const { error: storageError } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
            if (storageError) {
              console.error("Storage delete error:", storageError);
            } else {
              console.log(`Deleted from storage: ${bucket}/${filePath}`);
              deleted = true;
            }
          }
        } catch (e) {
          console.error("Failed to delete from storage:", e);
        }
      }

      // Also clear the URL from the database record if messageId and source provided
      if (body.messageId && body.source) {
        try {
          if (body.source === 'private') {
            // Try legacy private_messages
            await supabaseAdmin.from('private_messages')
              .update({ image_url: null, video_url: null })
              .eq('id', body.messageId);
            // Try messenger_messages
            await supabaseAdmin.from('messenger_messages')
              .update({ image_urls: null, video_url: null, voice_url: null, file_url: null, file_name: null })
              .eq('id', body.messageId);
          } else if (body.source === 'group') {
            await supabaseAdmin.from('group_chat_messages')
              .update({ image_url: null, video_url: null })
              .eq('id', body.messageId);
          }
          deleted = true;
        } catch (e) {
          console.error("Failed to clear DB reference:", e);
        }
      }

      return new Response(
        JSON.stringify({ success: deleted, message: deleted ? 'ფაილი წაიშალა' : 'ფაილი ვერ წაიშალა' }),
        { status: deleted ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle delete-all action - server-side bulk deletion (optimized with batch ops)
    if (body.action === 'delete-all') {
      console.log("Delete ALL files request, source:", body.source || 'all');
      const deleteSource = body.source || 'all';
      let totalDeleted = 0;

      // Helper: extract bucket and path from storage URL
      const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
        if (!url || (!url.includes('supabase.co/storage') && !url.includes('/storage/v1/object/'))) return null;
        const urlParts = url.split('/storage/v1/object/public/');
        if (!urlParts[1]) return null;
        const [bucket, ...pathParts] = urlParts[1].split('/');
        return { bucket, path: pathParts.join('/') };
      };

      // Helper: batch delete from storage (groups by bucket, removes up to 100 at a time)
      const batchDeleteStorage = async (urls: string[]) => {
        const byBucket = new Map<string, string[]>();
        for (const url of urls) {
          const parsed = parseStorageUrl(url);
          if (parsed) {
            if (!byBucket.has(parsed.bucket)) byBucket.set(parsed.bucket, []);
            byBucket.get(parsed.bucket)!.push(parsed.path);
          }
        }
        for (const [bucket, paths] of byBucket) {
          // Supabase storage.remove accepts arrays
          for (let i = 0; i < paths.length; i += 100) {
            const batch = paths.slice(i, i + 100);
            try {
              await supabaseAdmin.storage.from(bucket).remove(batch);
            } catch (e) {
              console.error(`Storage batch delete error for ${bucket}:`, e);
            }
          }
        }
      };

      // 1. Private messages (legacy)
      if (deleteSource === 'all' || deleteSource === 'private') {
        const { data: pmFiles } = await supabaseAdmin
          .from('private_messages')
          .select('id, image_url, video_url, gif_id')
          .or('image_url.not.is.null,video_url.not.is.null,gif_id.not.is.null')
          .eq('is_deleted', false)
          .neq('sender_id', CHEGE_USER_ID)
          .limit(5000);

        if (pmFiles && pmFiles.length > 0) {
          // Batch delete from storage
          const allUrls = pmFiles.flatMap(m => [m.image_url, m.video_url].filter(Boolean) as string[]);
          await batchDeleteStorage(allUrls);

          // Batch update DB - clear URLs for all IDs
          const ids = pmFiles.map(m => m.id);
          for (let i = 0; i < ids.length; i += 200) {
            const batch = ids.slice(i, i + 200);
            await supabaseAdmin.from('private_messages')
              .update({ image_url: null, video_url: null, gif_id: null })
              .in('id', batch);
          }
          totalDeleted += pmFiles.length;
        }

        // Messenger messages
        const { data: mmFiles } = await supabaseAdmin
          .from('messenger_messages')
          .select('id, image_urls, video_url, voice_url, file_url, gif_id')
          .or('image_urls.not.is.null,video_url.not.is.null,voice_url.not.is.null,file_url.not.is.null,gif_id.not.is.null')
          .eq('is_deleted', false)
          .neq('sender_id', CHEGE_USER_ID)
          .limit(5000);

        if (mmFiles && mmFiles.length > 0) {
          const allUrls: string[] = [];
          for (const msg of mmFiles) {
            if (msg.image_urls) {
              if (Array.isArray(msg.image_urls)) allUrls.push(...msg.image_urls);
              else if (typeof msg.image_urls === 'string') allUrls.push(msg.image_urls);
            }
            if (msg.video_url) allUrls.push(msg.video_url);
            if (msg.voice_url) allUrls.push(msg.voice_url);
            if (msg.file_url) allUrls.push(msg.file_url);
          }
          await batchDeleteStorage(allUrls);

          const ids = mmFiles.map(m => m.id);
          for (let i = 0; i < ids.length; i += 200) {
            const batch = ids.slice(i, i + 200);
            await supabaseAdmin.from('messenger_messages')
              .update({ image_urls: null, video_url: null, voice_url: null, file_url: null, file_name: null, gif_id: null })
              .in('id', batch);
          }
          totalDeleted += mmFiles.length;
        }
      }

      // 2. Group chat messages
      if (deleteSource === 'all' || deleteSource === 'group') {
        const { data: gcFiles } = await supabaseAdmin
          .from('group_chat_messages')
          .select('id, image_url, video_url, gif_id')
          .or('image_url.not.is.null,video_url.not.is.null,gif_id.not.is.null')
          .eq('is_deleted', false)
          .neq('user_id', CHEGE_USER_ID)
          .limit(5000);

        if (gcFiles && gcFiles.length > 0) {
          const allUrls = gcFiles.flatMap(m => [m.image_url, m.video_url].filter(Boolean) as string[]);
          await batchDeleteStorage(allUrls);

          const ids = gcFiles.map(m => m.id);
          for (let i = 0; i < ids.length; i += 200) {
            const batch = ids.slice(i, i + 200);
            await supabaseAdmin.from('group_chat_messages')
              .update({ image_url: null, video_url: null, gif_id: null })
              .in('id', batch);
          }
          totalDeleted += gcFiles.length;
        }
      }

      console.log(`Bulk delete complete: ${totalDeleted} messages cleaned`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${totalDeleted} ფაილი წაიშალა`,
          totalDeleted
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query params for pagination and source filter
    const url = new URL(req.url);
    let page = parseInt(url.searchParams.get("page") || body.page || "1");
    let limit = parseInt(url.searchParams.get("limit") || body.limit || "50");
    let source = url.searchParams.get("source") || body.source || "all";
    
    // Limit max items per page for performance
    limit = Math.min(limit, 50);
    const offset = (page - 1) * limit;

    const allFiles: any[] = [];
    let totalCount = 0;

    // ========== FETCH PRIVATE MESSAGES (legacy table) ==========
    let pmMessages: any[] = [];
    let pmCount = 0;
    
    if (source === "all" || source === "private") {
      let pmQuery = supabaseAdmin
        .from("private_messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          image_url,
          video_url,
          gif_id,
          created_at,
          conversation:conversations!private_messages_conversation_id_fkey (
            user1_id,
            user2_id
          )
        `, { count: "exact" })
        .or('image_url.not.is.null,video_url.not.is.null,gif_id.not.is.null')
        .eq('is_deleted', false)
        .neq('sender_id', CHEGE_USER_ID)
        .order('created_at', { ascending: false })
        .limit(1000);

      const { data, count } = await pmQuery;
      pmMessages = data || [];
      pmCount = count || 0;
    }

    // ========== FETCH MESSENGER MESSAGES (new messenger table) ==========
    let messengerMessages: any[] = [];
    let messengerCount = 0;

    if (source === "all" || source === "private") {
      let mmQuery = supabaseAdmin
        .from("messenger_messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          image_urls,
          video_url,
          voice_url,
          file_url,
          file_name,
          gif_id,
          created_at,
          conversation:messenger_conversations!messenger_messages_conversation_id_fkey (
            user1_id,
            user2_id
          )
        `, { count: "exact" })
        .or('image_urls.not.is.null,video_url.not.is.null,voice_url.not.is.null,file_url.not.is.null,gif_id.not.is.null')
        .eq('is_deleted', false)
        .neq('sender_id', CHEGE_USER_ID)
        .order('created_at', { ascending: false })
        .limit(2000);

      const { data, count } = await mmQuery;
      messengerMessages = data || [];
      messengerCount = count || 0;
    }

    // ========== FETCH GROUP CHAT MESSAGES ==========
    let gcMessages: any[] = [];
    let gcCount = 0;
    
    if (source === "all" || source === "group") {
      let gcQuery = supabaseAdmin
        .from("group_chat_messages")
        .select(`
          id,
          user_id,
          image_url,
          video_url,
          gif_id,
          created_at
        `, { count: "exact" })
        .or('image_url.not.is.null,video_url.not.is.null,gif_id.not.is.null')
        .eq('is_deleted', false)
        .neq('user_id', CHEGE_USER_ID)
        .order('created_at', { ascending: false })
        .limit(1000);

      const { data, count } = await gcQuery;
      gcMessages = data || [];
      gcCount = count || 0;
    }

    // ========== COLLECT USER IDS FROM RESULTS ==========
    const userIdsToFetch = new Set<string>();
    
    pmMessages.forEach(m => {
      userIdsToFetch.add(m.sender_id);
      const conv = m.conversation as any;
      if (conv) {
        userIdsToFetch.add(conv.user1_id);
        userIdsToFetch.add(conv.user2_id);
      }
    });

    messengerMessages.forEach(m => {
      userIdsToFetch.add(m.sender_id);
      const conv = m.conversation as any;
      if (conv) {
        userIdsToFetch.add(conv.user1_id);
        userIdsToFetch.add(conv.user2_id);
      }
    });
    
    gcMessages.forEach(m => userIdsToFetch.add(m.user_id));

    // Fetch profiles for users in actual results
    const userIdsArray = Array.from(userIdsToFetch).filter(Boolean);
    
    // Collect all gif_ids to fetch
    const gifIds = new Set<string>();
    pmMessages.forEach(m => { if (m.gif_id) gifIds.add(m.gif_id); });
    messengerMessages.forEach(m => { if (m.gif_id) gifIds.add(m.gif_id); });
    gcMessages.forEach(m => { if (m.gif_id) gifIds.add(m.gif_id); });
    const gifIdsArray = Array.from(gifIds);

    // Fetch profiles and gifs in parallel
    const [profilesResult, gifsResult] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIdsArray.length > 0 ? userIdsArray : ['00000000-0000-0000-0000-000000000000']),
      gifIdsArray.length > 0 
        ? supabaseAdmin.from("gifs").select("id, file_original, title").in("id", gifIdsArray)
        : Promise.resolve({ data: [] })
    ]);

    const profileMap = new Map(profilesResult.data?.map(p => [p.user_id, p.username]) || []);
    const gifMap = new Map(gifsResult.data?.map((g: any) => [g.id, g]) || []);

    // ========== PROCESS PRIVATE MESSAGES (legacy) ==========
    for (const msg of pmMessages) {
      const senderId = msg.sender_id;
      const conversation = msg.conversation as { user1_id: string; user2_id: string } | null;
      const receiverId = conversation 
        ? (conversation.user1_id === senderId ? conversation.user2_id : conversation.user1_id)
        : null;

      if (receiverId === CHEGE_USER_ID) continue;

      // If message has a gif_id, use GIF data
      if (msg.gif_id && gifMap.has(msg.gif_id)) {
        const gif = gifMap.get(msg.gif_id);
        allFiles.push({
          id: `${msg.id}-gif`,
          messageId: msg.id,
          source: 'private',
          fileType: 'image',
          fileUrl: gif.file_original,
          fileName: gif.title || 'GIF',
          sender: {
            userId: senderId,
            username: profileMap.get(senderId) || 'Unknown'
          },
          receiver: receiverId ? {
            userId: receiverId,
            username: profileMap.get(receiverId) || 'Unknown'
          } : null,
          createdAt: msg.created_at
        });
      }

      // Also add image/video if present
      if (msg.image_url || msg.video_url) {
        const { fileType, fileUrl, fileName } = parseFileInfo(msg.image_url, msg.video_url);
        allFiles.push({
          id: msg.id,
          messageId: msg.id,
          source: 'private',
          fileType,
          fileUrl,
          fileName,
          sender: {
            userId: senderId,
            username: profileMap.get(senderId) || 'Unknown'
          },
          receiver: receiverId ? {
            userId: receiverId,
            username: profileMap.get(receiverId) || 'Unknown'
          } : null,
          createdAt: msg.created_at
        });
      }
    }

    // ========== PROCESS MESSENGER MESSAGES ==========
    for (const msg of messengerMessages) {
      const senderId = msg.sender_id;
      const conversation = msg.conversation as { user1_id: string; user2_id: string } | null;
      const receiverId = conversation 
        ? (conversation.user1_id === senderId ? conversation.user2_id : conversation.user1_id)
        : null;

      if (receiverId === CHEGE_USER_ID) continue;

      // Add GIF if present
      if (msg.gif_id && gifMap.has(msg.gif_id)) {
        const gif = gifMap.get(msg.gif_id);
        allFiles.push({
          id: `${msg.id}-gif`,
          messageId: msg.id,
          source: 'private',
          fileType: 'image',
          fileUrl: gif.file_original,
          fileName: gif.title || 'GIF',
          sender: {
            userId: senderId,
            username: profileMap.get(senderId) || 'Unknown'
          },
          receiver: receiverId ? {
            userId: receiverId,
            username: profileMap.get(receiverId) || 'Unknown'
          } : null,
          createdAt: msg.created_at
        });
      }

      // Messenger has image_urls (array/json), video_url, voice_url, file_url
      const urls: string[] = [];
      
      if (msg.image_urls) {
        if (Array.isArray(msg.image_urls)) {
          urls.push(...msg.image_urls);
        } else if (typeof msg.image_urls === 'string') {
          urls.push(msg.image_urls);
        }
      }
      if (msg.video_url) urls.push(msg.video_url);
      if (msg.voice_url) urls.push(msg.voice_url);
      if (msg.file_url) urls.push(msg.file_url);

      for (const url of urls) {
        const { fileType, fileUrl, fileName } = parseFileInfoFromUrl(url);

        allFiles.push({
          id: `${msg.id}-${url.slice(-10)}`,
          messageId: msg.id,
          source: 'private',
          fileType,
          fileUrl,
          fileName,
          sender: {
            userId: senderId,
            username: profileMap.get(senderId) || 'Unknown'
          },
          receiver: receiverId ? {
            userId: receiverId,
            username: profileMap.get(receiverId) || 'Unknown'
          } : null,
          createdAt: msg.created_at
        });
      }
    }
    
    if (source === "private") totalCount = pmCount + messengerCount;

    // ========== PROCESS GROUP CHAT MESSAGES ==========
    for (const msg of gcMessages) {
      // Add GIF if present
      if (msg.gif_id && gifMap.has(msg.gif_id)) {
        const gif = gifMap.get(msg.gif_id);
        allFiles.push({
          id: `${msg.id}-gif`,
          messageId: msg.id,
          source: 'group',
          fileType: 'image',
          fileUrl: gif.file_original,
          fileName: gif.title || 'GIF',
          sender: {
            userId: msg.user_id,
            username: profileMap.get(msg.user_id) || 'Unknown'
          },
          receiver: null,
          roomName: 'ჯგუფური ჩათი',
          createdAt: msg.created_at
        });
      }

      if (msg.image_url || msg.video_url) {
        const { fileType, fileUrl, fileName } = parseFileInfo(msg.image_url, msg.video_url);
        allFiles.push({
          id: msg.id,
          messageId: msg.id,
          source: 'group',
          fileType,
          fileUrl,
          fileName,
          sender: {
            userId: msg.user_id,
            username: profileMap.get(msg.user_id) || 'Unknown'
          },
          receiver: null,
          roomName: 'ჯგუფური ჩათი',
          createdAt: msg.created_at
        });
      }
    }
    
    if (source === "group") totalCount = gcCount;

    // Sort all files by date and paginate if source is "all"
    if (source === "all") {
      allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      totalCount = allFiles.length;
      const paginatedFiles = allFiles.slice(offset, offset + limit);
      
      return new Response(
        JSON.stringify({
          files: paginatedFiles,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        files: allFiles,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in file-control:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to parse file info
function parseFileInfo(imageUrl: string | null, videoUrl: string | null): {
  fileType: 'image' | 'video' | 'audio' | 'document';
  fileUrl: string;
  fileName: string;
} {
  let fileType: 'image' | 'video' | 'audio' | 'document' = 'document';
  let fileUrl = '';
  
  if (imageUrl) {
    fileUrl = imageUrl;
    if (imageUrl.includes('voice') || imageUrl.includes('audio') || 
        imageUrl.endsWith('.mp3') || imageUrl.endsWith('.ogg') || 
        imageUrl.endsWith('.wav') || imageUrl.endsWith('.m4a') ||
        imageUrl.endsWith('.webm')) {
      fileType = 'audio';
    } else if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|avif)(\?|$)/i)) {
      fileType = 'image';
    } else if (imageUrl.match(/\.(mp4|mov|avi|mkv)(\?|$)/i)) {
      fileType = 'video';
    }
  } else if (videoUrl) {
    fileUrl = videoUrl;
    fileType = 'video';
  }

  let fileName = 'Unknown file';
  try {
    const urlPath = new URL(fileUrl).pathname;
    fileName = urlPath.split('/').pop() || 'Unknown file';
    fileName = decodeURIComponent(fileName);
  } catch {
    fileName = fileUrl.split('/').pop() || 'Unknown file';
  }

  return { fileType, fileUrl, fileName };
}

// Helper to parse file info from a single URL
function parseFileInfoFromUrl(url: string): {
  fileType: 'image' | 'video' | 'audio' | 'document';
  fileUrl: string;
  fileName: string;
} {
  let fileType: 'image' | 'video' | 'audio' | 'document' = 'document';
  
  if (url.includes('voice') || url.includes('audio') || 
      url.match(/\.(mp3|ogg|wav|m4a|webm)(\?|$)/i)) {
    fileType = 'audio';
  } else if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|avif)(\?|$)/i)) {
    fileType = 'image';
  } else if (url.match(/\.(mp4|mov|avi|mkv)(\?|$)/i)) {
    fileType = 'video';
  }

  let fileName = 'Unknown file';
  try {
    const urlPath = new URL(url).pathname;
    fileName = urlPath.split('/').pop() || 'Unknown file';
    fileName = decodeURIComponent(fileName);
  } catch {
    fileName = url.split('/').pop() || 'Unknown file';
  }

  return { fileType, fileUrl: url, fileName };
}
