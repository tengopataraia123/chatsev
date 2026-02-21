import { supabase } from '@/integrations/supabase/client';

// Regular expression to match GIF shortcodes like .შელბი.
const GIF_SHORTCODE_REGEX = /\.[^\s.]+\./g;

/**
 * Find GIF by shortcode
 */
export async function findGifByShortcode(shortcode: string): Promise<{ id: string; file_original: string; title: string } | null> {
  // Keep shortcode as-is since Georgian characters don't change with toLowerCase
  const normalizedShortcode = shortcode.toLowerCase();
  
  // Try exact match first
  let { data, error } = await supabase
    .from('gifs')
    .select('id, file_original, title')
    .eq('shortcode', normalizedShortcode)
    .eq('status', 'active')
    .single();
  
  // If not found, try case-insensitive match using ilike
  if (error || !data) {
    const { data: ilikeData, error: ilikeError } = await supabase
      .from('gifs')
      .select('id, file_original, title')
      .ilike('shortcode', shortcode)
      .eq('status', 'active')
      .single();
    
    if (ilikeError || !ilikeData) {
      return null;
    }
    return ilikeData;
  }
  
  return data;
}

/**
 * Check if a message contains only a GIF shortcode
 * Returns the shortcode if found, null otherwise
 */
export function extractGifShortcode(message: string): string | null {
  const trimmed = message.trim();
  
  // Check if the entire message is a shortcode
  if (trimmed.startsWith('.') && trimmed.endsWith('.') && trimmed.length >= 3) {
    // Make sure there are no spaces in the shortcode
    if (!trimmed.slice(1, -1).includes(' ')) {
      return trimmed;
    }
  }
  
  return null;
}

/**
 * Extract GIF shortcode from message text (can be part of a larger message)
 * Returns { shortcode, textWithoutShortcode } or null if no shortcode found
 */
export function extractGifShortcodeFromText(message: string): { shortcode: string; textWithoutShortcode: string } | null {
  // Match shortcodes like .შელბი. within text
  const regex = /\.[^\s.]+\./g;
  const match = message.match(regex);
  
  if (match && match.length > 0) {
    const shortcode = match[0]; // Take first shortcode found
    const textWithoutShortcode = message.replace(shortcode, '').trim();
    return { shortcode, textWithoutShortcode };
  }
  
  return null;
}

/**
 * Extract ALL GIF shortcodes from message text (for multiple GIFs in one message)
 * Returns array of { shortcode, position } or empty array if no shortcodes found
 */
export function extractAllGifShortcodes(message: string): string[] {
  const regex = /\.[^\s.]+\./g;
  const matches = message.match(regex);
  return matches || [];
}

/**
 * Remove all GIF shortcodes from text and return clean text
 */
export function removeAllGifShortcodes(message: string): string {
  const regex = /\.[^\s.]+\./g;
  return message.replace(regex, '').replace(/\s+/g, ' ').trim();
}

/**
 * Record GIF usage for recent
 */
export async function recordGifUsage(gifId: string, userId: string): Promise<void> {
  try {
    // Add to recent
    await supabase.from('gif_recent').insert({
      user_id: userId,
      gif_id: gifId
    });
  } catch (error) {
    // Silently fail
    console.log('Failed to record GIF usage:', error);
  }
}
