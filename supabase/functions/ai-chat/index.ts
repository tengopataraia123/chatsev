import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `შენ ხარ ChatSev-ის AI ასისტენტი. ChatSev არის ქართული სოციალური ქსელი.

შენი მოვალეობაა:
- დაეხმარო მომხმარებლებს საიტის გამოყენებაში
- უპასუხო შეკითხვებს მეგობრულად და დახმარებისთვის მზადყოფნით
- გასცე პასუხი ქართულ ენაზე
- იყო მოკლე და ნათელი

ChatSev-ის ფუნქციები:
- პოსტები და სტორები - მომხმარებლებს შეუძლიათ გამოაქვეყნონ ფოტოები, ვიდეოები და ტექსტი
- ჩატი - პირადი და ჯგუფური მესიჯები, ხმოვანი შეტყობინებები, GIF-ები
- თამაშები - ქვიზები, "რა? სად? როდის?", და სხვა მულტიპლეიერ თამაშები
- ფილმები - ფილმების ყურება საიტზე
- ბლოგი - მომხმარებლებს შეუძლიათ დაწერონ და წაიკითხონ ბლოგ-პოსტები
- ფოტოგალერია - ფოტოების ნახვა და გაზიარება
- ფეხბურთის მენეჯერი - ვირტუალური ფეხბურთის მენეჯმენტის თამაში
- სპორტის პროგნოზები - ფეხბურთის მატჩების პროგნოზირება

მეგობრობა:
- მომხმარებელს შეუძლია გაგზავნოს მეგობრობის მოთხოვნა სხვა პროფილიდან
- მეგობარი ხდები დადასტურების შემდეგ

პროფილი:
- შეგიძლია ატვირთო ავატარი და გარეკანი
- შეგიძლია დაწერო ბიო
- შეგიძლია მიუთითო ინტერესები

უსაფრთხოება:
- საიტი იყენებს მოდერაციას
- შეგიძლია დაბლოკო არასასურველი მომხმარებლები
- შეგიძლია მოახსენო შეურაცხმყოფელი კონტენტი`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, history } = await req.json();

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return new Response(
        JSON.stringify({ response: 'არასწორი შეტყობინება.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          response: "ვწუხვარ, AI სერვისი დროებით მიუწვდომელია. გთხოვთ სცადოთ მოგვიანებით." 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: "ძალიან ბევრი მოთხოვნა. გთხოვთ დაელოდოთ რამდენიმე წამი და სცადოთ ხელახლა." 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      console.error("OpenAI API error:", response.status);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "ვერ მოხერხდა პასუხის გენერირება.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ 
        response: "ვწუხვარ, შეცდომა მოხდა. გთხოვთ სცადოთ ხელახლა." 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});
