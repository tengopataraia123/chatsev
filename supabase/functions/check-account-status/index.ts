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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Parse request body
    const { loginEmail, password, verifyPassword } = await req.json()
    
    if (!loginEmail) {
      return new Response(
        JSON.stringify({ error: 'loginEmail საჭიროა' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile by login email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_status, deactivated_at, deactivation_reason, user_id')
      .eq('login_email', loginEmail)
      .single()

    if (profileError || !profile) {
      // If user not found, assume active (new user or not registered)
      return new Response(
        JSON.stringify({ 
          isDeactivated: false,
          accountStatus: 'active'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If verifyPassword is requested, verify the password without creating a session
    if (verifyPassword && password) {
      try {
        // Attempt to sign in to verify password
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: loginEmail,
          password: password
        })

        if (signInError) {
          console.log('[check-account-status] Password verification failed:', signInError.message)
          return new Response(
            JSON.stringify({ 
              isDeactivated: profile.account_status === 'deactivated',
              accountStatus: profile.account_status,
              passwordValid: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Password is valid - sign out immediately to not leave a dangling session
        if (signInData.session) {
          // Use admin to invalidate the session we just created
          await supabaseAdmin.auth.admin.signOut(signInData.session.access_token)
        }

        console.log('[check-account-status] Password verified successfully for deactivated account')
        return new Response(
          JSON.stringify({ 
            isDeactivated: profile.account_status === 'deactivated',
            accountStatus: profile.account_status,
            deactivatedAt: profile.deactivated_at,
            reason: profile.deactivation_reason,
            passwordValid: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (verifyError) {
        console.error('[check-account-status] Password verify error:', verifyError)
        return new Response(
          JSON.stringify({ 
            isDeactivated: profile.account_status === 'deactivated',
            accountStatus: profile.account_status,
            passwordValid: false,
            error: 'პაროლის შემოწმება ვერ მოხერხდა'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        isDeactivated: profile.account_status === 'deactivated',
        accountStatus: profile.account_status,
        deactivatedAt: profile.deactivated_at,
        reason: profile.deactivation_reason
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-account-status:', error)
    return new Response(
      JSON.stringify({ error: 'სერვერის შეცდომა' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
