import { supabase } from '@/integrations/supabase/client';
import { sendFriendContentNotification } from './useFriendNotifications';

export type ModuleActivityType = 
  | 'profile_photo'
  | 'cover_photo'
  | 'album_photo'
  | 'workout'
  | 'mood_entry'
  | 'confession'
  | 'ai_avatar'
  | 'qa_answer'
  | 'horoscope_share'
  | 'daily_fact_like'
  | 'job_post'
  | 'music_share'
  | 'memory_share'
  | 'challenge_join'
  | 'blog_post'
  | 'video_share';

interface LogActivityParams {
  userId: string;
  activityType: ModuleActivityType;
  description: string;
  imageUrl?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Logs a user activity to the feed
 * All module activities will be visible in user's profile activity feed
 */
export const logActivity = async ({
  userId,
  activityType,
  description,
  imageUrl = null,
  metadata = {}
}: LogActivityParams): Promise<{ success: boolean; activityId?: string; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        description,
        image_url: imageUrl,
        metadata: Object.keys(metadata).length > 0 ? metadata : null
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }

    // Send notifications to friends for certain activity types
    const notifyTypes: ModuleActivityType[] = [
      'workout', 'mood_entry', 'confession', 'ai_avatar', 'qa_answer',
      'blog_post', 'job_post', 'music_share', 'memory_share', 'challenge_join', 'horoscope_share',
      'video_share'
    ];

    if (notifyTypes.includes(activityType)) {
      // Map to friend notification type
      const friendNotifMap: Record<string, 'post' | 'photo' | 'video'> = {
        workout: 'post',
        mood_entry: 'post',
        confession: 'post',
        ai_avatar: 'photo',
        qa_answer: 'post',
        blog_post: 'post',
        job_post: 'post',
        music_share: 'post',
        memory_share: 'photo',
        challenge_join: 'post',
        horoscope_share: 'post',
        video_share: 'video'
      };
      
      const notifType = friendNotifMap[activityType] || 'post';
      await sendFriendContentNotification(userId, notifType, data.id);
    }

    return { success: true, activityId: data.id };
  } catch (error: any) {
    console.error('Error in logActivity:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Activity descriptions for different module actions
 */
export const getActivityDescription = {
  workout: (workoutName: string, duration: number, calories?: number) => 
    `დაასრულა ${workoutName} ვარჯიში (${duration} წუთი${calories ? `, ${calories} კალორია` : ''})`,
  
  mood: (moodEmoji: string, moodLabel: string) => 
    `დააფიქსირა განწყობა: ${moodEmoji} ${moodLabel}`,
  
  confession: () => 
    `გააზიარა ანონიმური კონფესია`,
  
  aiAvatar: (style: string) => 
    `შექმნა AI ავატარი ${style} სტილში`,
  
  qaAnswer: () => 
    `უპასუხა ანონიმურ კითხვას`,
  
  horoscope: (sign: string, prediction: string) => 
    `გააზიარა ჰოროსკოპი - ${sign}\n\n${prediction}`,
  
  dailyFact: () => 
    `მოიწონა დღის ფაქტი`,
  
  jobPost: (jobTitle: string) => 
    `გამოაქვეყნა ვაკანსია: ${jobTitle}`,
  
  musicShare: (songName: string, artist?: string) => 
    `გააზიარა სიმღერა: ${songName}${artist ? ` - ${artist}` : ''}`,
  
  memory: (year?: string) => 
    `გააზიარა მოგონება${year ? ` ${year} წლიდან` : ''}`,
  
  challengeJoin: (challengeName: string) => 
    `შეუერთდა ჩელენჯს: ${challengeName}`,
  
  blogPost: (title: string) => 
    `გამოაქვეყნა ბლოგი: ${title}`,
  
  videoShare: (platform: string, caption?: string) => 
    `გააზიარა ${platform} ვიდეო${caption ? `: ${caption}` : ''}`
};

export default logActivity;
