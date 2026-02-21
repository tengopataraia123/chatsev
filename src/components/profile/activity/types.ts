// Unified Activity Feed Types - Facebook style

export type ActivityType = 
  | 'post' 
  | 'share' 
  | 'group_post' 
  | 'profile_photo' 
  | 'cover_photo' 
  | 'poll' 
  | 'quiz' 
  | 'video' 
  | 'album_photo'
  | 'relationship_update'
  | 'badge_update'
  | 'verification'
  // Module activity types
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
  | 'blog_post';

export type PrivacyLevel = 'public' | 'friends' | 'onlyme';

export interface ActivityAuthor {
  id: string;
  username: string;
  avatar_url: string | null;
  is_verified?: boolean;
  gender?: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  cover_url: string | null;
  is_private: boolean;
  visibility?: string;
}

export interface OriginalPost {
  id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  author: ActivityAuthor;
  created_at: string;
  is_deleted?: boolean;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: ActivityAuthor;
  target_user_id: string;
  created_at: Date;
  privacy_level: PrivacyLevel;
  
  // Content fields
  content?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  images?: string[];
  
  // Group post specific
  group?: GroupInfo | null;
  is_group_member?: boolean;
  
  // Share specific
  original_post?: OriginalPost | null;
  share_caption?: string | null;
  
  // Activity specific
  activity_description?: string | null;
  
  // Counts
  likes_count: number;
  comments_count: number;
  shares_count: number;
  
  // User interaction state
  is_liked: boolean;
  is_bookmarked: boolean;
  
  // Mood
  mood_emoji?: string | null;
  mood_text?: string | null;

  // Pinned post
  is_pinned?: boolean;
}

export type ActivityFilter = 'all' | 'posts' | 'shares' | 'photos' | 'videos' | 'groups' | 'polls';

export interface FetchActivitiesParams {
  userId: string;
  viewerId?: string;
  filter?: ActivityFilter;
  page?: number;
  limit?: number;
  searchQuery?: string;
}
