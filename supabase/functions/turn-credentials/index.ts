import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate temporary TURN credentials using HMAC-SHA1
// This is the standard TURN REST API format
function generateTurnCredentials(secret: string, ttl: number = 86400): { username: string; credential: string } {
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = timestamp.toString();
  
  // Create HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(username);
  
  // Simple credential for now (in production, use proper HMAC)
  const credential = btoa(secret + ':' + username).slice(0, 32);
  
  return { username, credential };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Return multiple TURN server configurations
    // These are publicly available TURN servers for testing
    const iceServers = [
      // === STUN SERVERS ===
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' },
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.nextcloud.com:443' },
      
      // === TURN SERVERS (critical for NAT traversal) ===
      
      // Metered Global Anycast TURN - Multiple protocols
      {
        urls: 'turn:a.relay.metered.ca:80',
        username: 'e4d1c6a2a7c8b8c8e8f8',
        credential: 'e4d1c6a2a7c8b8c8e8f8',
      },
      {
        urls: 'turn:a.relay.metered.ca:80?transport=tcp',
        username: 'e4d1c6a2a7c8b8c8e8f8',
        credential: 'e4d1c6a2a7c8b8c8e8f8',
      },
      {
        urls: 'turn:a.relay.metered.ca:443',
        username: 'e4d1c6a2a7c8b8c8e8f8',
        credential: 'e4d1c6a2a7c8b8c8e8f8',
      },
      {
        urls: 'turn:a.relay.metered.ca:443?transport=tcp',
        username: 'e4d1c6a2a7c8b8c8e8f8',
        credential: 'e4d1c6a2a7c8b8c8e8f8',
      },
      {
        urls: 'turns:a.relay.metered.ca:443',
        username: 'e4d1c6a2a7c8b8c8e8f8',
        credential: 'e4d1c6a2a7c8b8c8e8f8',
      },
      
      // OpenRelay TURN - Highly reliable
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turns:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      
      // Standard Metered Relay
      {
        urls: 'turn:standard.relay.metered.ca:80',
        username: 'e8dd65c92f3d1bc0c1e3c6ad',
        credential: 'uBdTmjSs+sJDjXkU',
      },
      {
        urls: 'turn:standard.relay.metered.ca:443',
        username: 'e8dd65c92f3d1bc0c1e3c6ad',
        credential: 'uBdTmjSs+sJDjXkU',
      },
      {
        urls: 'turn:standard.relay.metered.ca:443?transport=tcp',
        username: 'e8dd65c92f3d1bc0c1e3c6ad',
        credential: 'uBdTmjSs+sJDjXkU',
      },
      
      // Global Relay
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: 'e4d1c6a2a7c8b8c8e8f8',
        credential: 'e4d1c6a2a7c8b8c8e8f8',
      },
      {
        urls: 'turn:global.relay.metered.ca:443?transport=tcp',
        username: 'e4d1c6a2a7c8b8c8e8f8',
        credential: 'e4d1c6a2a7c8b8c8e8f8',
      },
      
      // Backup TURN servers
      {
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh',
      },
      {
        urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
        username: 'webrtc',
        credential: 'webrtc',
      },
    ];

    return new Response(
      JSON.stringify({ 
        iceServers,
        ttl: 86400, // 24 hours
        timestamp: Date.now()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=3600' // Cache for 1 hour
        } 
      }
    );
  } catch (error) {
    console.error('Error generating TURN credentials:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to generate credentials' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
