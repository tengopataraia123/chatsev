import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://api.the-odds-api.com/v4';

// Supported sports mapping
const SPORTS_MAP: Record<string, { apiKey: string; title: string; country: string; countryCode: string }> = {
  'soccer_epl': { apiKey: 'soccer_epl', title: 'პრემიერ ლიგა', country: 'ინგლისი', countryCode: 'GB' },
  'soccer_spain_la_liga': { apiKey: 'soccer_spain_la_liga', title: 'ლა ლიგა', country: 'ესპანეთი', countryCode: 'ES' },
  'soccer_italy_serie_a': { apiKey: 'soccer_italy_serie_a', title: 'სერია A', country: 'იტალია', countryCode: 'IT' },
  'soccer_germany_bundesliga': { apiKey: 'soccer_germany_bundesliga', title: 'ბუნდესლიგა', country: 'გერმანია', countryCode: 'DE' },
  'soccer_france_ligue_one': { apiKey: 'soccer_france_ligue_one', title: 'ლიგა 1', country: 'საფრანგეთი', countryCode: 'FR' },
  'soccer_uefa_champs_league': { apiKey: 'soccer_uefa_champs_league', title: 'ჩემპიონთა ლიგა', country: 'ევროპა', countryCode: 'EU' },
  'soccer_uefa_europa_league': { apiKey: 'soccer_uefa_europa_league', title: 'ევროპა ლიგა', country: 'ევროპა', countryCode: 'EU' },
  'soccer_uefa_nations_league': { apiKey: 'soccer_uefa_nations_league', title: 'ერთა ლიგა', country: 'ევროპა', countryCode: 'EU' },
  'soccer_conmebol_copa_libertadores': { apiKey: 'soccer_conmebol_copa_libertadores', title: 'კოპა ლიბერტადორეს', country: 'სამხრ. ამერიკა', countryCode: 'INT' },
  'soccer_efl_champ': { apiKey: 'soccer_efl_champ', title: 'ჩემპიონშიპი', country: 'ინგლისი', countryCode: 'GB' },
  'soccer_netherlands_eredivisie': { apiKey: 'soccer_netherlands_eredivisie', title: 'ერედივიზია', country: 'ჰოლანდია', countryCode: 'NL' },
  'soccer_portugal_primeira_liga': { apiKey: 'soccer_portugal_primeira_liga', title: 'პრიმეირა ლიგა', country: 'პორტუგალია', countryCode: 'PT' },
  'soccer_turkey_super_league': { apiKey: 'soccer_turkey_super_league', title: 'სუპერ ლიგა', country: 'თურქეთი', countryCode: 'TR' },
  'soccer_brazil_campeonato': { apiKey: 'soccer_brazil_campeonato', title: 'ბრაზილეირაო', country: 'ბრაზილია', countryCode: 'BR' },
  'soccer_argentina_primera_division': { apiKey: 'soccer_argentina_primera_division', title: 'პრიმერა დივიზიონი', country: 'არგენტინა', countryCode: 'AR' },
  'soccer_mexico_ligamx': { apiKey: 'soccer_mexico_ligamx', title: 'ლიგა MX', country: 'მექსიკა', countryCode: 'MX' },
  'soccer_usa_mls': { apiKey: 'soccer_usa_mls', title: 'MLS', country: 'აშშ', countryCode: 'US' },
  'soccer_scotland_premiership': { apiKey: 'soccer_scotland_premiership', title: 'შოტლანდიის პრემიერშიპი', country: 'შოტლანდია', countryCode: 'GB' },
  'soccer_belgium_first_div': { apiKey: 'soccer_belgium_first_div', title: 'ბელგიის პირველი დივიზიონი', country: 'ბელგია', countryCode: 'BE' },
  'soccer_russia_premier_league': { apiKey: 'soccer_russia_premier_league', title: 'რუსეთის პრემიერ ლიგა', country: 'რუსეთი', countryCode: 'RU' },
  'soccer_austria_bundesliga': { apiKey: 'soccer_austria_bundesliga', title: 'ავსტრიის ბუნდესლიგა', country: 'ავსტრია', countryCode: 'AT' },
  'soccer_switzerland_superleague': { apiKey: 'soccer_switzerland_superleague', title: 'შვეიცარიის სუპერლიგა', country: 'შვეიცარია', countryCode: 'CH' },
  'soccer_greece_super_league': { apiKey: 'soccer_greece_super_league', title: 'საბერძნეთის სუპერლიგა', country: 'საბერძნეთი', countryCode: 'GR' },
  'basketball_nba': { apiKey: 'basketball_nba', title: 'NBA', country: 'აშშ', countryCode: 'US' },
  'basketball_euroleague': { apiKey: 'basketball_euroleague', title: 'ევროლიგა', country: 'ევროპა', countryCode: 'EU' },
  'basketball_ncaab': { apiKey: 'basketball_ncaab', title: 'NCAA კალათბურთი', country: 'აშშ', countryCode: 'US' },
  'tennis_atp_aus_open': { apiKey: 'tennis_atp_aus_open', title: 'Australian Open', country: 'ავსტრალია', countryCode: 'AU' },
  'tennis_atp_french_open': { apiKey: 'tennis_atp_french_open', title: 'Roland Garros', country: 'საფრანგეთი', countryCode: 'FR' },
  'tennis_atp_us_open': { apiKey: 'tennis_atp_us_open', title: 'US Open', country: 'აშშ', countryCode: 'US' },
  'tennis_atp_wimbledon': { apiKey: 'tennis_atp_wimbledon', title: 'Wimbledon', country: 'ინგლისი', countryCode: 'GB' },
  'americanfootball_nfl': { apiKey: 'americanfootball_nfl', title: 'NFL', country: 'აშშ', countryCode: 'US' },
  'americanfootball_ncaaf': { apiKey: 'americanfootball_ncaaf', title: 'NCAA ფეხბურთი', country: 'აშშ', countryCode: 'US' },
  'icehockey_nhl': { apiKey: 'icehockey_nhl', title: 'NHL', country: 'აშშ/კანადა', countryCode: 'US' },
  'mma_mixed_martial_arts': { apiKey: 'mma_mixed_martial_arts', title: 'UFC/MMA', country: 'მსოფლიო', countryCode: 'INT' },
  'boxing_boxing': { apiKey: 'boxing_boxing', title: 'კრივი', country: 'მსოფლიო', countryCode: 'INT' },
  'rugbyleague_nrl': { apiKey: 'rugbyleague_nrl', title: 'NRL', country: 'ავსტრალია', countryCode: 'AU' },
  'rugbyunion_super_rugby': { apiKey: 'rugbyunion_super_rugby', title: 'Super Rugby', country: 'ავსტრალია', countryCode: 'AU' },
  'cricket_test_match': { apiKey: 'cricket_test_match', title: 'კრიკეტი - ტესტ მატჩები', country: 'მსოფლიო', countryCode: 'INT' },
};

// Get sport category from sport key
const getSportCategory = (sportKey: string): string => {
  if (sportKey.includes('soccer')) return 'soccer';
  if (sportKey.includes('basketball')) return 'basketball';
  if (sportKey.includes('tennis')) return 'tennis';
  if (sportKey.includes('americanfootball')) return 'football';
  if (sportKey.includes('icehockey')) return 'hockey';
  if (sportKey.includes('mma') || sportKey.includes('boxing')) return 'mma';
  if (sportKey.includes('rugby')) return 'rugby';
  if (sportKey.includes('cricket')) return 'cricket';
  return 'other';
};

// Transform API response to our format
const transformMatch = (apiMatch: any, sportInfo: any) => {
  const markets = apiMatch.bookmakers?.[0]?.markets || [];
  const h2hMarket = markets.find((m: any) => m.key === 'h2h');
  const totalsMarket = markets.find((m: any) => m.key === 'totals');
  const spreadsMarket = markets.find((m: any) => m.key === 'spreads');

  const transformedMarkets: any[] = [];

  // Main market (1X2 or H2H)
  if (h2hMarket) {
    transformedMarkets.push({
      key: 'h2h',
      name: 'მთავარი',
      outcomes: h2hMarket.outcomes.map((o: any) => ({
        name: o.name,
        price: o.price
      }))
    });
  }

  // Totals (Over/Under)
  if (totalsMarket) {
    transformedMarkets.push({
      key: 'totals',
      name: 'ტოტალი',
      outcomes: totalsMarket.outcomes.map((o: any) => ({
        name: o.name === 'Over' ? `მეტი ${o.point}` : `ნაკლები ${o.point}`,
        price: o.price,
        point: o.point
      }))
    });
  }

  // Spreads (Handicap)
  if (spreadsMarket) {
    transformedMarkets.push({
      key: 'spreads',
      name: 'ჰანდიკაპი',
      outcomes: spreadsMarket.outcomes.map((o: any) => ({
        name: `${o.name} (${o.point > 0 ? '+' : ''}${o.point})`,
        price: o.price,
        point: o.point
      }))
    });
  }

  return {
    id: apiMatch.id,
    sport_key: apiMatch.sport_key,
    sport_title: sportInfo?.title || apiMatch.sport_title,
    league: sportInfo?.title || apiMatch.sport_title,
    country: sportInfo?.country || 'მსოფლიო',
    country_code: sportInfo?.countryCode || 'INT',
    commence_time: apiMatch.commence_time,
    home_team: apiMatch.home_team,
    away_team: apiMatch.away_team,
    bookmakers: [{
      key: 'combined',
      markets: transformedMarkets.length > 0 ? transformedMarkets : [{
        key: 'h2h',
        outcomes: []
      }]
    }],
    is_live: new Date(apiMatch.commence_time) <= new Date(),
    score: undefined,
    category: getSportCategory(apiMatch.sport_key),
  };
};

// Fetch live scores
const fetchLiveScores = async (sportKey: string): Promise<any[]> => {
  const apiKey = Deno.env.get('ODDS_API_KEY');
  if (!apiKey) return [];
  
  try {
    const response = await fetch(
      `${BASE_URL}/sports/${sportKey}/scores?apiKey=${apiKey}&daysFrom=1`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
};

// Fetch odds for a sport
const fetchOddsForSport = async (sportKey: string, markets: string = 'h2h,totals,spreads'): Promise<any[]> => {
  const apiKey = Deno.env.get('ODDS_API_KEY');
  if (!apiKey) {
    console.log('No API key found, returning empty array');
    return [];
  }
  
  try {
    const url = `${BASE_URL}/sports/${sportKey}/odds?apiKey=${apiKey}&regions=eu&markets=${markets}&oddsFormat=decimal`;
    console.log(`Fetching: ${sportKey}`);
    
    const response = await fetch(url, { 
      headers: { 'Content-Type': 'application/json' } 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Failed to fetch ${sportKey}: ${response.status} - ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`Got ${data.length} matches for ${sportKey}`);
    return data;
  } catch (error) {
    console.log(`Error fetching ${sportKey}:`, error);
    return [];
  }
};

// Get active sports
const fetchActiveSports = async (): Promise<string[]> => {
  const apiKey = Deno.env.get('ODDS_API_KEY');
  if (!apiKey) return Object.keys(SPORTS_MAP);
  
  try {
    const response = await fetch(
      `${BASE_URL}/sports?apiKey=${apiKey}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!response.ok) return Object.keys(SPORTS_MAP);
    
    const sports = await response.json();
    return sports
      .filter((s: any) => s.active && !s.has_outrights)
      .map((s: any) => s.key);
  } catch {
    return Object.keys(SPORTS_MAP);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sport = url.searchParams.get('sport') || 'all';
    const liveOnly = url.searchParams.get('live') === 'true';
    const league = url.searchParams.get('league');
    
    console.log(`Request: sport=${sport}, liveOnly=${liveOnly}, league=${league}`);

    let allMatches: any[] = [];
    
    // Determine which sports to fetch
    let sportsToFetch: string[] = [];
    
    if (sport === 'all') {
      // Fetch most popular sports
      sportsToFetch = [
        'soccer_epl',
        'soccer_spain_la_liga',
        'soccer_italy_serie_a',
        'soccer_germany_bundesliga',
        'soccer_france_ligue_one',
        'soccer_uefa_champs_league',
        'basketball_nba',
        'icehockey_nhl',
        'americanfootball_nfl',
        'tennis_atp_aus_open',
      ];
    } else if (sport === 'soccer') {
      sportsToFetch = [
        'soccer_epl',
        'soccer_spain_la_liga',
        'soccer_italy_serie_a',
        'soccer_germany_bundesliga',
        'soccer_france_ligue_one',
        'soccer_uefa_champs_league',
        'soccer_uefa_europa_league',
        'soccer_netherlands_eredivisie',
        'soccer_portugal_primeira_liga',
        'soccer_turkey_super_league',
        'soccer_usa_mls',
      ];
    } else if (sport === 'basketball') {
      sportsToFetch = ['basketball_nba', 'basketball_euroleague', 'basketball_ncaab'];
    } else if (sport === 'tennis') {
      sportsToFetch = ['tennis_atp_aus_open', 'tennis_atp_french_open', 'tennis_atp_us_open', 'tennis_atp_wimbledon'];
    } else if (sport === 'football') {
      sportsToFetch = ['americanfootball_nfl', 'americanfootball_ncaaf'];
    } else if (sport === 'hockey') {
      sportsToFetch = ['icehockey_nhl'];
    } else if (sport === 'mma') {
      sportsToFetch = ['mma_mixed_martial_arts', 'boxing_boxing'];
    } else {
      sportsToFetch = Object.keys(SPORTS_MAP).filter(k => k.includes(sport));
    }

    // Filter by specific league if provided
    if (league) {
      sportsToFetch = sportsToFetch.filter(s => s.includes(league.toLowerCase().replace(/\s+/g, '_')));
    }

    // Fetch odds for each sport (limited to avoid rate limits)
    const fetchPromises = sportsToFetch.slice(0, 5).map(async (sportKey) => {
      const sportInfo = SPORTS_MAP[sportKey];
      const matches = await fetchOddsForSport(sportKey);
      return matches.map(m => transformMatch(m, sportInfo));
    });

    const results = await Promise.all(fetchPromises);
    allMatches = results.flat();

    // Sort by commence time
    allMatches.sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());

    // Calculate sport counts
    const sportCounts: Record<string, { count: number; liveCount: number }> = {};
    
    for (const match of allMatches) {
      const category = getSportCategory(match.sport_key);
      if (!sportCounts[category]) {
        sportCounts[category] = { count: 0, liveCount: 0 };
      }
      sportCounts[category].count++;
      if (match.is_live) {
        sportCounts[category].liveCount++;
      }
    }

    const sports = Object.entries(sportCounts).map(([key, value]) => ({
      key,
      count: value.count,
      liveCount: value.liveCount
    }));

    // Filter live only if requested
    if (liveOnly) {
      allMatches = allMatches.filter(m => m.is_live);
    }

    // Get unique leagues
    const leagues = [...new Set(allMatches.map(m => ({
      key: m.sport_key,
      title: m.sport_title,
      country: m.country,
      country_code: m.country_code
    })))].reduce((acc: any[], curr) => {
      if (!acc.find(l => l.key === curr.key)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    console.log(`Returning ${allMatches.length} matches`);

    return new Response(
      JSON.stringify({
        matches: allMatches,
        sports,
        leagues,
        updated_at: new Date().toISOString(),
        api_status: Deno.env.get('ODDS_API_KEY') ? 'connected' : 'no_api_key'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch odds',
        details: errorMessage,
        matches: [],
        sports: [],
        leagues: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
