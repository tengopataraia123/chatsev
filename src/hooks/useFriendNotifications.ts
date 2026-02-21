import { supabase } from '@/integrations/supabase/client';

type FriendContentType = 
  | 'post' 
  | 'photo' 
  | 'video' 
  | 'story' 
  | 'reel'
  | 'avatar_change'
  | 'cover_change'
  | 'poll'
  | 'quiz';

/**
 * Sends notifications to all friends of the user when they create content or update profile
 */
export const sendFriendContentNotification = async (
  userId: string,
  contentType: FriendContentType,
  contentId?: string
) => {
  try {
    // Get all accepted friendships where the user is either requester or addressee
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (friendError) {
      console.error('Error fetching friendships:', friendError);
      return;
    }

    if (!friendships || friendships.length === 0) return;

    // Get friend IDs
    const friendIds = friendships.map(f => 
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    // Map content type to notification type
    const notificationTypeMap: Record<FriendContentType, string> = {
      post: 'friend_post',
      photo: 'friend_photo',
      video: 'friend_video',
      story: 'friend_story',
      reel: 'friend_reel',
      avatar_change: 'friend_avatar_change',
      cover_change: 'friend_cover_change',
      poll: 'friend_poll',
      quiz: 'friend_quiz'
    };

    const notificationType = notificationTypeMap[contentType];

    // Create notifications for all friends
    const notifications = friendIds.map(friendId => ({
      user_id: friendId,
      from_user_id: userId,
      type: notificationType,
      post_id: contentId || null
    }));

    // Insert notifications in batches of 50, skip duplicates using upsert
    const batchSize = 50;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      // Use upsert with ignoreDuplicates to prevent duplicate notifications
      const { error: notifError } = await supabase
        .from('notifications')
        .upsert(batch, { 
          onConflict: 'user_id,from_user_id,type,post_id',
          ignoreDuplicates: true 
        });
      
      if (notifError) {
        // Ignore unique constraint violations - they're expected for duplicates
        if (!notifError.code?.includes('23505')) {
          console.error('Error sending friend notifications:', notifError);
        }
      }
    }
  } catch (error) {
    console.error('Error in sendFriendContentNotification:', error);
  }
};

/**
 * Get notification message for friend activity
 */
export const getFriendNotificationMessage = (contentType: FriendContentType, username: string): string => {
  switch (contentType) {
    case 'post':
      return `თქვენმა მეგობარმა ${username} დაამატა ახალი პოსტი`;
    case 'photo':
      return `თქვენმა მეგობარმა ${username} დაამატა ახალი ფოტო`;
    case 'video':
      return `თქვენმა მეგობარმა ${username} დაამატა ახალი ვიდეო`;
    case 'story':
      return `თქვენმა მეგობარმა ${username} დაამატა ახალი სთორი`;
    case 'reel':
      return `თქვენმა მეგობარმა ${username} დაამატა ახალი Reel`;
    case 'avatar_change':
      return `თქვენმა მეგობარმა ${username} შეცვალა პროფილის ფოტო`;
    case 'cover_change':
      return `თქვენმა მეგობარმა ${username} შეცვალა ფონის სურათი`;
    case 'poll':
      return `თქვენმა მეგობარმა ${username} შექმნა ახალი გამოკითხვა`;
    case 'quiz':
      return `თქვენმა მეგობარმა ${username} შექმნა ახალი ქვიზი`;
    default:
      return `თქვენს მეგობარს ${username} აქვს ახალი აქტივობა`;
  }
};
