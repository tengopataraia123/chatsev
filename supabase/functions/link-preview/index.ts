const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Fetching preview for:', formattedUrl);

    // Fetch the page with a browser-like user agent
    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch: ${response.status}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    
    // Parse Open Graph and meta tags
    const getMetaContent = (property: string): string | null => {
      // Try og: tags first
      const ogMatch = html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i'));
      if (ogMatch) return ogMatch[1];
      
      // Try twitter: tags
      const twitterMatch = html.match(new RegExp(`<meta[^>]+name=["']twitter:${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                           html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${property}["']`, 'i'));
      if (twitterMatch) return twitterMatch[1];
      
      // Try standard meta tags
      const metaMatch = html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'));
      if (metaMatch) return metaMatch[1];
      
      return null;
    };

    // Get title - try og:title first, then title tag
    let title = getMetaContent('title');
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : null;
    }

    // Get description
    let description = getMetaContent('description');

    // Get image
    let image = getMetaContent('image');
    
    // Make image URL absolute if relative
    if (image && !image.startsWith('http')) {
      const urlObj = new URL(formattedUrl);
      if (image.startsWith('//')) {
        image = 'https:' + image;
      } else if (image.startsWith('/')) {
        image = urlObj.origin + image;
      } else {
        image = urlObj.origin + '/' + image;
      }
    }

    // Get site name
    const siteName = getMetaContent('site_name') || new URL(formattedUrl).hostname;

    // Get favicon
    let favicon: string | null = null;
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i) ||
                         html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i);
    if (faviconMatch) {
      favicon = faviconMatch[1];
      if (favicon && !favicon.startsWith('http')) {
        const urlObj = new URL(formattedUrl);
        if (favicon.startsWith('//')) {
          favicon = 'https:' + favicon;
        } else if (favicon.startsWith('/')) {
          favicon = urlObj.origin + favicon;
        } else {
          favicon = urlObj.origin + '/' + favicon;
        }
      }
    }
    // Default favicon
    if (!favicon) {
      favicon = new URL(formattedUrl).origin + '/favicon.ico';
    }

    // Check for video type
    const videoType = getMetaContent('type');
    const isVideo = videoType?.includes('video') || 
                    formattedUrl.includes('/video/') || 
                    formattedUrl.includes('/match/') ||
                    formattedUrl.includes('/live/');

    console.log('Preview data:', { title, description, image, siteName, isVideo });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: formattedUrl,
          title: title || siteName,
          description: description?.substring(0, 200) || null,
          image,
          siteName,
          favicon,
          isVideo
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching link preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch preview';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
