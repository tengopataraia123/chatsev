import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GeoData {
  country: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
}

async function getGeoFromIP(ip: string): Promise<GeoData> {
  try {
    // Use ip-api.com (free, no API key needed, 45 req/min limit)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country || null,
        city: data.city || null,
        region: data.regionName || null,
        countryCode: data.countryCode || null,
      };
    }
    
    console.log('[Geolocate] ip-api.com failed, trying backup...');
    
    // Backup: ipapi.co (free tier)
    const backupResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    const backupData = await backupResponse.json();
    
    if (!backupData.error) {
      return {
        country: backupData.country_name || null,
        city: backupData.city || null,
        region: backupData.region || null,
        countryCode: backupData.country_code || null,
      };
    }
    
    return { country: null, city: null, region: null, countryCode: null };
  } catch (error) {
    console.error('[Geolocate] Error:', error);
    return { country: null, city: null, region: null, countryCode: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body first to get user_id, device_fingerprint, and client IP
    const { user_id, device_fingerprint, ip_address } = await req.json().catch(() => ({}));

    // Use IP passed from client (which was already fetched via get-client-ip)
    // Fallback to headers only if not provided
    const ip = ip_address ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      null;

    if (!ip || ip === 'unknown') {
      return new Response(
        JSON.stringify({ error: 'Could not determine IP address' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log('[Geolocate] Processing IP:', ip, 'for user:', user_id);

    // Get geolocation data
    const geoData = await getGeoFromIP(ip);

    if (user_id && device_fingerprint) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Update device_accounts with geo data
      const { error } = await supabase
        .from('device_accounts')
        .update({
          ip_address: ip,
          geo_country: geoData.country,
          geo_city: geoData.city,
          geo_region: geoData.region,
          geo_updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .eq('device_fingerprint', device_fingerprint);

      if (error) {
        console.error('[Geolocate] DB update error:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        ip,
        ...geoData,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Geolocate] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
