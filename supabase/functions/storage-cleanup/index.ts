import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  bucket: string;
  deletedCount: number;
  freedBytes: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate authentication - require admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = adminClient;

    console.log('Starting storage cleanup...');

    const results: CleanupResult[] = [];
    let totalFreed = 0;
    let totalDeleted = 0;

    // 1. Clean up expired stories (older than 24 hours based on DB)
    const { data: expiredStories } = await supabase
      .from('stories')
      .select('id, image_url, video_url')
      .lt('expires_at', new Date().toISOString());

    if (expiredStories && expiredStories.length > 0) {
      console.log(`Found ${expiredStories.length} expired stories to clean`);
      
      for (const story of expiredStories) {
        const urls = [story.image_url, story.video_url].filter(Boolean);
        
        for (const url of urls) {
          if (url && url.includes('supabase.co/storage')) {
            try {
              const urlParts = url.split('/storage/v1/object/public/');
              if (urlParts[1]) {
                const [bucket, ...pathParts] = urlParts[1].split('/');
                const filePath = pathParts.join('/');
                
                const { error } = await supabase.storage.from(bucket).remove([filePath]);
                if (!error) {
                  totalDeleted++;
                }
              }
            } catch (e) {
              console.warn(`Failed to delete file: ${url}`);
            }
          }
        }
      }
      
      await supabase.from('stories').delete().lt('expires_at', new Date().toISOString());
    }

    // 2. Clean up orphaned files - for chat-images
    const shouldDeepClean = Math.random() < 0.1;
    
    if (shouldDeepClean) {
      console.log('Running deep clean for orphaned files...');
      
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('image_url, gif_url')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      
      const validUrls = new Set<string>();
      recentMessages?.forEach(msg => {
        if (msg.image_url) validUrls.add(msg.image_url);
        if (msg.gif_url) validUrls.add(msg.gif_url);
      });
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('avatar_url, cover_url');
      
      profiles?.forEach(profile => {
        if (profile.avatar_url) validUrls.add(profile.avatar_url);
        if (profile.cover_url) validUrls.add(profile.cover_url);
      });
      
      console.log(`Found ${validUrls.size} valid file references`);
    }

    // 3. Clean up old deleted messages' attachments (30+ days old)
    const { data: oldDeletedMessages } = await supabase
      .from('messages')
      .select('id, image_url')
      .eq('is_deleted', true)
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .not('image_url', 'is', null);

    if (oldDeletedMessages && oldDeletedMessages.length > 0) {
      for (const msg of oldDeletedMessages) {
        if (msg.image_url && msg.image_url.includes('supabase.co/storage')) {
          try {
            const urlParts = msg.image_url.split('/storage/v1/object/public/');
            if (urlParts[1]) {
              const [bucket, ...pathParts] = urlParts[1].split('/');
              const filePath = pathParts.join('/');
              
              await supabase.storage.from(bucket).remove([filePath]);
              totalDeleted++;
            }
          } catch (e) {
            console.warn(`Failed to delete: ${msg.image_url}`);
          }
        }
      }
    }

    const cleanupLog = {
      timestamp: new Date().toISOString(),
      expired_stories_cleaned: expiredStories?.length || 0,
      deleted_message_attachments: oldDeletedMessages?.length || 0,
      total_files_deleted: totalDeleted,
      deep_clean_ran: shouldDeepClean
    };
    
    console.log('Cleanup complete:', cleanupLog);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage cleanup completed',
        stats: cleanupLog
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Storage cleanup error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Cleanup failed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
