export type StoryType = 'photo' | 'video' | 'text';

export interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  content: string | null;
  story_type: StoryType;
  duration_seconds: number;
  text_content: TextStoryContent | null;
  background_style: string | null;
  font_style: string | null;
  is_highlighted: boolean;
  music_title: string | null;
  music_url: string | null;
  created_at: string;
  expires_at: string;
  total_views: number;
  unique_views: number;
  total_reactions: number;
  total_replies: number;
  avg_watch_time: number;
  completion_rate: number;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface TextStoryContent {
  text: string;
  align: 'left' | 'center' | 'right';
  fontSize: 'small' | 'medium' | 'large';
}

export interface StoryReaction {
  id: string;
  story_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface StoryReply {
  id: string;
  story_id: string;
  sender_id: string;
  content: string | null;
  gif_id: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface StoryAnalytics {
  id: string;
  story_id: string;
  viewer_id: string;
  watch_time_seconds: number;
  completed: boolean;
  viewed_at: string;
}

// Legacy simple reactions (deprecated)
export const REACTION_EMOJIS = ['🔥', '❤️', '😂'] as const;

// Facebook-style reactions
export const FB_REACTIONS = [
  { type: 'like', emoji: '👍', label: 'მოწონება', color: '#2078F4' },
  { type: 'love', emoji: '❤️', label: 'სიყვარული', color: '#F33E58' },
  { type: 'care', emoji: '🤗', label: 'ზრუნვა', color: '#F7B125' },
  { type: 'haha', emoji: '😂', label: 'ჰაჰა', color: '#F7B125' },
  { type: 'wow', emoji: '😮', label: 'ვაუ', color: '#F7B125' },
  { type: 'sad', emoji: '😢', label: 'სევდა', color: '#F7B125' },
  { type: 'angry', emoji: '😡', label: 'ბრაზი', color: '#E9710F' },
] as const;

export type FBReactionType = typeof FB_REACTIONS[number]['type'];

export const getStoryReactionEmoji = (type: string) => {
  return FB_REACTIONS.find(r => r.type === type)?.emoji || '👍';
};

export const getStoryReactionLabel = (type: string) => {
  return FB_REACTIONS.find(r => r.type === type)?.label || 'მოწონება';
};

export const getStoryReactionColor = (type: string) => {
  return FB_REACTIONS.find(r => r.type === type)?.color || '#2078F4';
};

export const TEXT_BACKGROUNDS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  '#1a1a2e',
  '#16213e',
  '#0f3460',
  '#e94560',
] as const;

export const FONT_STYLES = [
  { id: 'bold', name: 'Bold', className: 'font-bold' },
  { id: 'elegant', name: 'Elegant', className: 'font-serif italic' },
  { id: 'neon', name: 'Neon', className: 'font-mono tracking-wider' },
  { id: 'minimal', name: 'Minimal', className: 'font-light tracking-wide' },
] as const;
