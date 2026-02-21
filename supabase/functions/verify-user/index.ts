import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super_admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Super Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, targetUserId, note, requestId } = await req.json();

    if (!action || !targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Action and targetUserId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Update user profile to verified
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          verified_note: note || null
        })
        .eq('user_id', targetUserId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If there's a request, approve it
      if (requestId) {
        await supabaseClient
          .from('verification_requests')
          .update({
            status: 'approved',
            decided_by: user.id,
            decided_at: new Date().toISOString(),
            admin_note: note || null
          })
          .eq('id', requestId);
      }

      // Log admin action
      await supabaseClient.from('admin_action_logs').insert({
        admin_id: user.id,
        admin_role: 'super_admin',
        action_type: 'verify_user',
        action_category: 'user_management',
        target_user_id: targetUserId,
        description: `Verified user${note ? ': ' + note : ''}`
      });

      // Create notification for user
      await supabaseClient.from('notifications').insert({
        user_id: targetUserId,
        from_user_id: user.id,
        type: 'verification',
        message: 'თქვენი პროფილი წარმატებით დადასტურდა ✅',
        is_read: false
      });

      return new Response(
        JSON.stringify({ success: true, message: 'User verified successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    if (action === 'unverify') {
      // Remove verification
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          is_verified: false,
          verified_at: null,
          verified_by: null,
          verified_note: null
        })
        .eq('user_id', targetUserId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log admin action
      await supabaseClient.from('admin_action_logs').insert({
        admin_id: user.id,
        admin_role: 'super_admin',
        action_type: 'unverify_user',
        action_category: 'user_management',
        target_user_id: targetUserId,
        description: `Removed verification${note ? ': ' + note : ''}`
      });

      // Create notification for user
      await supabaseClient.from('notifications').insert({
        user_id: targetUserId,
        from_user_id: user.id,
        type: 'verification',
        message: 'Verified ნიშნული მოიხსნა თქვენი პროფილიდან',
        is_read: false
      });

      return new Response(
        JSON.stringify({ success: true, message: 'User unverified successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reject') {
      // Reject verification request
      if (!requestId) {
        return new Response(
          JSON.stringify({ error: 'Request ID required for rejection' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseClient
        .from('verification_requests')
        .update({
          status: 'rejected',
          decided_by: user.id,
          decided_at: new Date().toISOString(),
          admin_note: note || 'მოთხოვნა უარყოფილია'
        })
        .eq('id', requestId);

      // Log admin action
      await supabaseClient.from('admin_action_logs').insert({
        admin_id: user.id,
        admin_role: 'super_admin',
        action_type: 'reject_verification',
        action_category: 'user_management',
        target_user_id: targetUserId,
        description: `Rejected verification request${note ? ': ' + note : ''}`
      });

      // Notify user
      await supabaseClient.from('notifications').insert({
        user_id: targetUserId,
        from_user_id: user.id,
        type: 'verification',
        message: note || 'თქვენი ვერიფიკაციის მოთხოვნა უარყოფილია',
        is_read: false
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Request rejected successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
