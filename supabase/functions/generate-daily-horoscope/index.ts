import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SIGNS = [
  { id: '9b7faf6f-1822-411c-87f3-9356fdd88cff', name: 'ვერძი', element: 'fire' },
  { id: '6dac289a-2c70-40ee-ba15-6746dcfe00f1', name: 'კურო', element: 'earth' },
  { id: '648f6b6c-1092-4c03-aca5-6679dd18448b', name: 'ტყუპები', element: 'air' },
  { id: '303bda07-f8de-45b4-94bb-4156fe8bf9ff', name: 'კირჩხიბი', element: 'water' },
  { id: 'd417b9b2-554e-451c-b5d9-d2e12977cc6e', name: 'ლომი', element: 'fire' },
  { id: 'f9291f2e-16ab-4dc1-be40-d923d12539fc', name: 'ქალწული', element: 'earth' },
  { id: 'c6314624-71e4-46a0-8a00-6f7dc2f7f664', name: 'სასწორი', element: 'air' },
  { id: 'c1823c8c-63ba-45a8-bbd6-17ca7d46eae3', name: 'მორიელი', element: 'water' },
  { id: '4c88c10e-9fd7-4589-a09b-843223a20983', name: 'მშვილდოსანი', element: 'fire' },
  { id: '4e5a32d1-c33b-4752-b03f-eb845791af90', name: 'თხის რქა', element: 'earth' },
  { id: 'a6606507-6fcf-499d-8ff7-6480fee93af0', name: 'მერწყული', element: 'air' },
  { id: 'eac03e24-cf72-4a15-883c-16267fca1bee', name: 'თევზები', element: 'water' },
];

const LUCKY_COLORS: Record<string, string[]> = {
  fire: ['წითელი', 'ოქროსფერი', 'ნარინჯისფერი', 'ყვითელი'],
  earth: ['მწვანე', 'ყავისფერი', 'ბეჟი', 'მუქი მწვანე'],
  air: ['ცისფერი', 'ლურჯი', 'ვერცხლისფერი', 'თეთრი'],
  water: ['ლურჯი', 'იისფერი', 'ზღვისფერი', 'ვარდისფერი'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    console.log(`[Horoscope] Generating predictions for ${today}`);

    // Check if predictions already exist for today
    const { data: existing } = await supabase
      .from('horoscope_daily')
      .select('id')
      .eq('date', today)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[Horoscope] Predictions already exist for today');
      return new Response(
        JSON.stringify({ success: true, message: 'Predictions already exist for today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate predictions for all signs using AI
    const predictions = [];

    for (const sign of SIGNS) {
      const prompt = `შექმენი დღევანდელი ჰოროსკოპის პროგნოზი ${sign.name}-სთვის ქართულ ენაზე. 
      პროგნოზი უნდა იყოს 2-3 წინადადება, პოზიტიური და მოტივაციური. 
      გაითვალისწინე რომ ${sign.name} არის ${sign.element === 'fire' ? 'ცეცხლის' : sign.element === 'earth' ? 'მიწის' : sign.element === 'air' ? 'ჰაერის' : 'წყლის'} სტიქიის ნიშანი.
      დააბრუნე მხოლოდ პროგნოზის ტექსტი, არანაირი დამატებითი ტექსტი.`;

      try {
        const aiResponse = await fetch('https://llm.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
          }),
        });

        const aiData = await aiResponse.json();
        const prediction = aiData.choices?.[0]?.message?.content?.trim() || getDefaultPrediction(sign.name, sign.element);

        // Generate ratings (1-5)
        const loveRating = Math.floor(Math.random() * 3) + 3; // 3-5
        const careerRating = Math.floor(Math.random() * 3) + 3; // 3-5
        const healthRating = Math.floor(Math.random() * 3) + 3; // 3-5

        // Generate lucky number and color
        const luckyNumber = Math.floor(Math.random() * 99) + 1;
        const colors = LUCKY_COLORS[sign.element];
        const luckyColor = colors[Math.floor(Math.random() * colors.length)];

        predictions.push({
          sign_id: sign.id,
          date: today,
          prediction,
          love_rating: loveRating,
          career_rating: careerRating,
          health_rating: healthRating,
          lucky_number: luckyNumber,
          lucky_color: luckyColor,
        });

        console.log(`[Horoscope] Generated prediction for ${sign.name}`);
      } catch (err) {
        console.error(`[Horoscope] Error generating for ${sign.name}:`, err);
        // Use default prediction on error
        predictions.push({
          sign_id: sign.id,
          date: today,
          prediction: getDefaultPrediction(sign.name, sign.element),
          love_rating: 4,
          career_rating: 4,
          health_rating: 4,
          lucky_number: Math.floor(Math.random() * 99) + 1,
          lucky_color: LUCKY_COLORS[sign.element][0],
        });
      }
    }

    // Insert all predictions
    const { error: insertError } = await supabase
      .from('horoscope_daily')
      .insert(predictions);

    if (insertError) {
      console.error('[Horoscope] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[Horoscope] Successfully generated ${predictions.length} predictions`);

    return new Response(
      JSON.stringify({ success: true, count: predictions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Horoscope] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getDefaultPrediction(name: string, element: string): string {
  const templates: Record<string, string[]> = {
    fire: [
      'დღეს შენი ენერგია მაღალ დონეზეა! გამოიყენე ეს ძალა ახალი მიზნების მისაღწევად.',
      'ოპტიმიზმი და თავდაჯერებულობა შენი მთავარი მოკავშირეებია დღეს.',
      'შემოქმედებითი იდეები თავს იჩენს - ნუ შეგეშინდება რისკის!',
    ],
    earth: [
      'სტაბილურობა და მოთმინება დღევანდელი დღის გასაღებია.',
      'პრაქტიკული მიდგომა დაგეხმარება მნიშვნელოვანი საკითხების გადაწყვეტაში.',
      'ფინანსური საკითხები პოზიტიურად წარიმართება.',
    ],
    air: [
      'კომუნიკაცია დღეს განსაკუთრებით მნიშვნელოვანია - გამოიყენე სიტყვის ძალა!',
      'ახალი იდეები და შთაბეჭდილებები შენს გზაზე გელის.',
      'სოციალური აქტივობა სიამოვნებას მოგანიჭებს.',
    ],
    water: [
      'ინტუიცია დღეს განსაკუთრებით ძლიერია - ენდე შინაგან ხმას.',
      'ემოციური ჰარმონია და სულიერი სიმშვიდე მოგელის.',
      'რომანტიკული განწყობა დღეს თანამგზავრია.',
    ],
  };

  const elementTemplates = templates[element] || templates.fire;
  return elementTemplates[Math.floor(Math.random() * elementTemplates.length)];
}
