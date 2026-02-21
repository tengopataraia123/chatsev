import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MentionNotificationParams {
  content: string;
  contextType: 'post' | 'comment' | 'reply' | 'group_post' | 'forum_post';
  contextId: string;
  excludeUserId?: string;
}

/**
 * Hook to handle mention notifications
 * Extracts @mentions from content and sends notifications to mentioned users
 */
export function useMentionNotifications() {
  const { user } = useAuth();

  const sendMentionNotifications = useCallback(async ({
    content,
    contextType,
    contextId,
    excludeUserId
  }: MentionNotificationParams) => {
    if (!user?.id || !content) return [];

    // Extract unique usernames from @mentions
    const mentionRegex = /@([\wა-ჰ]+)/gi;
    const mentions = new Set<string>();
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1].toLowerCase();
      mentions.add(username);
    }

    if (mentions.size === 0) return [];

    try {
      // Lookup user IDs for mentioned usernames
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('username', Array.from(mentions).map(u => u.toLowerCase()));

      if (!profiles || profiles.length === 0) return [];

      // Get notification type based on context
      const notificationTypeMap: Record<string, string> = {
        'post': 'post_mention',
        'comment': 'comment_mention',
        'reply': 'reply_mention',
        'group_post': 'group_post_mention',
        'forum_post': 'forum_post_mention'
      };
      
      const notificationType = notificationTypeMap[contextType] || 'mention';

      // Create notifications for each mentioned user (excluding self and specified user)
      const notificationsToInsert = profiles
        .filter(p => p.user_id !== user.id && p.user_id !== excludeUserId)
        .map(p => ({
          user_id: p.user_id,
          from_user_id: user.id,
          type: notificationType,
          message: content.length > 100 ? content.substring(0, 100) + '...' : content,
          related_id: contextId
        }));

      if (notificationsToInsert.length > 0) {
        await supabase.from('notifications').insert(notificationsToInsert);
      }

      return profiles.map(p => p.user_id);
    } catch (error) {
      console.error('Error sending mention notifications:', error);
      return [];
    }
  }, [user?.id]);

  // Extract mentions from content (for UI display purposes)
  const extractMentions = useCallback((content: string): string[] => {
    if (!content) return [];
    const mentionRegex = /@([\wა-ჰ]+)/gi;
    const mentions = new Set<string>();
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.add(match[1]);
    }
    
    return Array.from(mentions);
  }, []);

  // Extract hashtags from content
  const extractHashtags = useCallback((content: string): string[] => {
    if (!content) return [];
    const hashtagRegex = /#([\wა-ჰ]+)/gi;
    const hashtags = new Set<string>();
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.add(match[1].toLowerCase());
    }
    
    return Array.from(hashtags);
  }, []);

  return {
    sendMentionNotifications,
    extractMentions,
    extractHashtags
  };
}
