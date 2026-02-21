import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user is admin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin'])
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Access denied - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { room_table } = await req.json();
    
    // Valid tables - group_chat_messages is used for Gossip Room (ჭორბიურო)
    const validTables = ['group_chat_messages', 'night_room_messages', 'emigrants_room_messages', 'dj_room_messages'];
    if (!validTables.includes(room_table)) {
      return new Response(JSON.stringify({ error: 'Invalid room table' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Admin ${user.id} (${roleData.role}) instantly clearing room: ${room_table}`);

    // Get message count before deletion
    const { count: initialCount } = await supabaseAdmin
      .from(room_table)
      .select('id', { count: 'exact', head: true });
    
    const totalMessages = initialCount || 0;
    console.log(`Found ${totalMessages} messages to delete`);

    // Delete in smaller batches using order + limit to avoid URL length issues
    let deletedCount = 0;
    const BATCH_SIZE = 100; // Small batches to avoid timeout
    const MAX_ITERATIONS = 500; // Safety limit
    
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Get oldest batch of messages
      const { data: batch } = await supabaseAdmin
        .from(room_table)
        .select('id')
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE);
      
      if (!batch || batch.length === 0) {
        break;
      }
      
      // Delete this specific batch by IDs
      const ids = batch.map(m => m.id);
      const { error: deleteError } = await supabaseAdmin
        .from(room_table)
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        console.error('Batch delete error:', deleteError);
        // Continue trying with remaining messages
        continue;
      }
      
      deletedCount += batch.length;
      console.log(`Deleted batch ${i + 1}: ${batch.length} messages, total: ${deletedCount}`);
      
      // If we deleted less than batch size, we're done
      if (batch.length < BATCH_SIZE) {
        break;
      }
    }

    console.log(`Successfully cleared ${deletedCount} messages from ${room_table}`);

    // Get room display name for logging
    const roomNames: Record<string, { ge: string; en: string; ru: string }> = {
      'group_chat_messages': { ge: 'ჭორ ბიურო', en: 'Gossip Room', ru: 'Комната сплетен' },
      'night_room_messages': { ge: 'ღამის ოთახი', en: 'Night Room', ru: 'Ночная комната' },
      'emigrants_room_messages': { ge: 'ემიგრანტები', en: 'Emigrants Room', ru: 'Комната эмигрантов' },
      'dj_room_messages': { ge: 'DJ Room', en: 'DJ Room', ru: 'DJ комната' }
    };
    
    const roomName = roomNames[room_table] || { ge: room_table, en: room_table, ru: room_table };

    // Log the room clear action to admin_action_logs
    const { error: logError } = await supabaseAdmin
      .from('admin_action_logs')
      .insert({
        admin_id: user.id,
        admin_role: roleData.role,
        action_type: 'room_clear',
        action_category: 'chat',
        target_user_id: null,
        target_content_id: room_table,
        target_content_type: 'chat_room',
        description: `გასუფთავდა ოთახი: ${roomName.ge}`,
        metadata: {
          room_table: room_table,
          room_name: roomName,
          deleted_count: deletedCount,
          cleared_at: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('Failed to log admin action:', logError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      deleted: deletedCount,
      message: `წაიშალა ${deletedCount} შეტყობინება`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});