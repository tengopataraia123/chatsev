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
    const { loginEmail, password } = await req.json()
    
    if (!loginEmail || !password) {
      return new Response(
        JSON.stringify({ error: 'მონაცემები არასრულია' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile by login email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, account_status, reactivation_count')
      .eq('login_email', loginEmail)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError)
      return new Response(
        JSON.stringify({ error: 'მომხმარებელი ვერ მოიძებნა' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.account_status !== 'deactivated') {
      return new Response(
        JSON.stringify({ error: 'ანგარიში აქტიურია', isActive: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify password by attempting sign in
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: loginEmail,
      password: password
    })

    if (signInError) {
      console.error('Password verification failed:', signInError)
      return new Response(
        JSON.stringify({ error: 'პაროლი არასწორია' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update profile to active
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        account_status: 'active',
        reactivated_at: new Date().toISOString(),
        reactivation_count: (profile.reactivation_count || 0) + 1,
        // Clear deactivation fields
        deactivated_at: null,
        deactivated_by: null,
        deactivation_reason: null
      })
      .eq('user_id', profile.user_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'აღდგენა ვერ მოხერხდა' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Account reactivated: ${profile.user_id}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'ანგარიში აღდგენილია',
        session: signInData.session
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in account-reactivate:', error)
    return new Response(
      JSON.stringify({ error: 'სერვერის შეცდომა' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
