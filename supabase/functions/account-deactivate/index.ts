import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'ავტორიზაცია საჭიროა' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'ავტორიზაცია ვერ მოხერხდა' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { password, reason } = await req.json()
    
    if (!password) {
      return new Response(
        JSON.stringify({ error: 'პაროლი აუცილებელია' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's login email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('login_email, account_status')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'პროფილი ვერ მოიძებნა' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.account_status === 'deactivated') {
      return new Response(
        JSON.stringify({ error: 'ანგარიში უკვე დეაქტივირებულია' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify password by attempting sign in
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.login_email,
      password: password
    })

    if (signInError) {
      console.error('Password verification failed:', signInError)
      return new Response(
        JSON.stringify({ error: 'პაროლი არასწორია' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update profile to deactivated
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        account_status: 'deactivated',
        deactivated_at: new Date().toISOString(),
        deactivated_by: 'self',
        deactivation_reason: reason || null
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'დეაქტივაცია ვერ მოხერხდა' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sign out the user from ALL sessions using admin API
    try {
      // This invalidates all refresh tokens for the user
      const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(user.id)
      if (signOutError) {
        console.error('Admin signOut error:', signOutError)
      }
    } catch (e) {
      console.error('SignOut exception:', e)
    }

    console.log(`Account deactivated: ${user.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ანგარიში დეაქტივირებულია',
        signedOut: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in account-deactivate:', error)
    return new Response(
      JSON.stringify({ error: 'სერვერის შეცდომა' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
