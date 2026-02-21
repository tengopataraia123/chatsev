import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StorageStats {
  buckets: {
    name: string;
    size_bytes: number;
    file_count: number;
  }[];
  total_storage_bytes: number;
  database_stats: {
    private_messages: number;
    group_messages: number;
    notifications: number;
    profile_visits: number;
    stories: number;
    posts: number;
    gifs: number;
  };
  active_sessions: number;
  active_rooms: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    // Check admin role using service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
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
    
    const { action, params } = await req.json()
    
    console.log('[CloudStorageManager] Action:', action)

    switch (action) {
      case 'get-stats': {
        // Get storage bucket stats
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
        
        if (bucketsError) {
          console.error('[CloudStorageManager] Buckets error:', bucketsError)
        }

        const bucketStats = []
        let totalStorageBytes = 0

        if (buckets) {
          for (const bucket of buckets) {
            try {
              const { data: files } = await supabase.storage
                .from(bucket.name)
                .list('', { limit: 1000 })
              
              let bucketSize = 0
              let fileCount = files?.length || 0

              bucketSize = fileCount * 512000

              bucketStats.push({
                name: bucket.name,
                size_bytes: bucketSize,
                file_count: fileCount
              })
              totalStorageBytes += bucketSize
            } catch (e) {
              console.log(`[CloudStorageManager] Could not list bucket ${bucket.name}`)
            }
          }
        }

        const [
          { count: privateMessages },
          { count: groupMessages },
          { count: notifications },
          { count: profileVisits },
          { count: stories },
          { count: posts },
          { count: gifs },
          { count: activeSessions },
          { count: activeRooms }
        ] = await Promise.all([
          supabase.from('private_messages').select('*', { count: 'exact', head: true }),
          supabase.from('group_chat_messages').select('*', { count: 'exact', head: true }),
          supabase.from('notifications').select('*', { count: 'exact', head: true }),
          supabase.from('profile_visits').select('*', { count: 'exact', head: true }),
          supabase.from('stories').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('gifs').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('dj_rooms').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ])

        const stats: StorageStats = {
          buckets: bucketStats,
          total_storage_bytes: totalStorageBytes,
          database_stats: {
            private_messages: privateMessages || 0,
            group_messages: groupMessages || 0,
            notifications: notifications || 0,
            profile_visits: profileVisits || 0,
            stories: stories || 0,
            posts: posts || 0,
            gifs: gifs || 0
          },
          active_sessions: activeSessions || 0,
          active_rooms: activeRooms || 0
        }

        await supabase.from('storage_usage_log').insert({
          total_storage_bytes: totalStorageBytes,
          active_sessions_count: activeSessions || 0,
          active_rooms_count: activeRooms || 0
        })

        return new Response(JSON.stringify({ success: true, stats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cleanup-logs': {
        const retentionDays = params?.retentionDays || 3
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
        
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('is_read', true)
          .lt('created_at', cutoffDate)
        
        const notificationsDeleted = deleteError ? 0 : 1

        return new Response(JSON.stringify({ 
          success: true, 
          deleted: { notifications: notificationsDeleted || 0 }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cleanup-messages': {
        const retentionDays = params?.retentionDays || 30
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
        
        let totalDeleted = 0
        const BATCH_SIZE = 500

        const { data: deletedPM } = await supabase.rpc('delete_old_private_messages_batch', {
          cutoff_date: cutoffDate,
          batch_limit: BATCH_SIZE
        })
        totalDeleted += deletedPM || 0

        const { data: deletedGM } = await supabase.rpc('delete_old_group_messages', {
          cutoff_date: cutoffDate,
          batch_limit: BATCH_SIZE
        })
        totalDeleted += deletedGM || 0

        return new Response(JSON.stringify({ 
          success: true, 
          deleted: { total: totalDeleted }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cleanup-profile-visits': {
        const retentionDays = params?.retentionDays || 90
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
        
        const { data: deleted } = await supabase.rpc('delete_old_profile_visits', {
          cutoff_date: cutoffDate,
          batch_limit: 500
        })

        return new Response(JSON.stringify({ 
          success: true, 
          deleted: deleted || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cleanup-expired-stories': {
        const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        
        const { error: storyError } = await supabase
          .from('stories')
          .delete()
          .lt('expires_at', cutoffDate)
        
        const count = storyError ? 0 : 1

        return new Response(JSON.stringify({ 
          success: true, 
          deleted: count || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cleanup-message-reads': {
        const retentionDays = params?.retentionDays || 30
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
        
        const { data: deleted } = await supabase.rpc('delete_old_message_reads', {
          cutoff_date: cutoffDate,
          batch_limit: 500
        })

        return new Response(JSON.stringify({ 
          success: true, 
          deleted: deleted || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cleanup-inactive-rooms': {
        const hoursInactive = params?.hoursInactive || 24
        const cutoffDate = new Date(Date.now() - hoursInactive * 60 * 60 * 1000).toISOString()
        
        const { error: roomError } = await supabase
          .from('dj_rooms')
          .update({ is_active: false })
          .eq('is_active', true)
          .lt('updated_at', cutoffDate)
        
        const count = roomError ? 0 : 1

        return new Response(JSON.stringify({ 
          success: true, 
          deactivated: count || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'emergency-cleanup': {
        console.log('[CloudStorageManager] Running emergency cleanup...')
        
        const results: Record<string, number> = {}
        const cutoff7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const cutoff30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const { error: notifError } = await supabase
          .from('notifications')
          .delete()
          .eq('is_read', true)
          .lt('created_at', cutoff7Days)
        results.notifications = notifError ? 0 : 1

        const { data: visits } = await supabase.rpc('delete_old_profile_visits', {
          cutoff_date: cutoff30Days,
          batch_limit: 1000
        })
        results.profile_visits = visits || 0

        const { data: reads } = await supabase.rpc('delete_old_message_reads', {
          cutoff_date: cutoff7Days,
          batch_limit: 1000
        })
        results.message_reads = reads || 0

        const { error: storyErr } = await supabase
          .from('stories')
          .delete()
          .lt('expires_at', cutoff7Days)
        results.expired_stories = storyErr ? 0 : 1

        const { error: roomErr } = await supabase
          .from('dj_rooms')
          .update({ is_active: false })
          .eq('is_active', true)
          .lt('updated_at', cutoff7Days)
        results.inactive_rooms = roomErr ? 0 : 1

        const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0)

        return new Response(JSON.stringify({ 
          success: true, 
          results,
          total_deleted: totalDeleted
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get-settings': {
        const { data: settings } = await supabase
          .from('cleanup_settings')
          .select('*')

        return new Response(JSON.stringify({ 
          success: true, 
          settings: settings || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update-settings': {
        const { key, value } = params
        
        const { error } = await supabase
          .from('cleanup_settings')
          .update({ 
            setting_value: value, 
            updated_at: new Date().toISOString() 
          })
          .eq('setting_key', key)

        if (error) {
          return new Response(JSON.stringify({ success: false, error: 'Failed to update setting' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error: unknown) {
    console.error('[CloudStorageManager] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
