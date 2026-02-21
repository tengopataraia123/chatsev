import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── FCM V1 auth helpers ──────────────────────────────────────────────
function base64url(source: ArrayBuffer): string {
  const bytes = new Uint8Array(source);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createSignedJwt(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    enc.encode(unsignedToken)
  );

  return `${unsignedToken}.${base64url(signature)}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(serviceAccount: any): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const jwt = await createSignedJwt(serviceAccount);
  const resp = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Token exchange failed: ${errText}`);
  }

  const data = await resp.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

// ── Notification type to Georgian title/body mapping ─────────────────
function getNotificationContent(type: string, senderUsername: string, message?: string): { title: string; body: string } {
  switch (type) {
    case 'friend_request':
      return { title: 'მეგობრობის მოთხოვნა 👥', body: `${senderUsername} გთხოვთ მეგობრობას` };
    case 'friend_accepted':
      return { title: 'მეგობრობა მიღებულია ✅', body: `${senderUsername} დაგიმეგობრდათ` };
    case 'post_reaction':
    case 'like':
      return { title: 'ახალი ლაიქი ❤️', body: `${senderUsername}-მ მოიწონა თქვენი პოსტი` };
    case 'comment':
    case 'post_comment':
      return { title: 'ახალი კომენტარი 💬', body: `${senderUsername}: ${(message || '').substring(0, 80)}` };
    case 'comment_reply':
      return { title: 'პასუხი კომენტარზე 💬', body: `${senderUsername} უპასუხა თქვენს კომენტარს` };
    case 'mention':
      return { title: 'მოხსენიება 📢', body: `${senderUsername}-მ მოგიხსენიათ` };
    case 'story_reaction':
      return { title: 'რეაქცია სთორიზე 🔥', body: `${senderUsername}-მ მოიწონა თქვენი სთორი` };
    case 'game_invite':
      return { title: 'თამაშის მოწვევა 🎮', body: `${senderUsername} გიწვევთ თამაშში` };
    case 'poll_vote':
      return { title: 'ახალი ხმა 📊', body: `${senderUsername}-მ მისცა ხმა თქვენს გამოკითხვას` };
    default:
      return { title: 'ახალი შეტყობინება 🔔', body: message || `${senderUsername}-სგან ახალი ნოტიფიკაცია` };
  }
}

// ── Main handler ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both direct calls and webhook/trigger calls
    const authHeader = req.headers.get("Authorization");
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If called with auth header, validate the caller
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { target_user_id, title, body: messageBody, data: messageData, type, from_user_id } = body;

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: "target_user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If type is provided, auto-generate title/body from sender info
    let finalTitle = title;
    let finalBody = messageBody;

    if (type && from_user_id && !title) {
      // Get sender username
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('user_id', from_user_id)
        .maybeSingle();
      
      const senderUsername = senderProfile?.username || 'მომხმარებელი';
      const content = getNotificationContent(type, senderUsername, messageBody);
      finalTitle = content.title;
      finalBody = content.body;
    }

    if (!finalTitle) {
      finalTitle = 'ახალი შეტყობინება 🔔';
    }

    // Get target user's push tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", target_user_id);

    if (tokensError) throw tokensError;

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No tokens found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get FCM access token
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not configured");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    const projectId = serviceAccount.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0;
    const staleTokens: string[] = [];

    for (const { token } of tokens) {
      const fcmMessage: any = {
        message: {
          token,
          notification: {
            title: finalTitle,
            body: finalBody || "",
          },
          android: {
            priority: "high",
            notification: {
              channel_id: "default",
              sound: "default",
            },
          },
        },
      };

      if (messageData) {
        fcmMessage.message.data = messageData;
      }

      const resp = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmMessage),
      });

      if (resp.ok) {
        sent++;
      } else {
        const errBody = await resp.json().catch(() => ({}));
        const errorCode = errBody?.error?.details?.[0]?.errorCode || errBody?.error?.code;
        
        if (
          errorCode === "UNREGISTERED" ||
          errorCode === "INVALID_ARGUMENT" ||
          resp.status === 404
        ) {
          staleTokens.push(token);
        }
        console.error(`FCM send failed for token ${token.substring(0, 20)}...`, errBody);
      }
    }

    if (staleTokens.length > 0) {
      await supabaseAdmin
        .from("push_tokens")
        .delete()
        .in("token", staleTokens);
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: tokens.length, cleaned: staleTokens.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
