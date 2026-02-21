/**
 * Messenger Types - Facebook Messenger Style
 */

export type ChatTheme = 
  | 'default' | 'love' | 'tie_dye' | 'berry' | 'candy' | 'citrus'
  | 'tropical' | 'forest' | 'ocean' | 'lavender' | 'rose' | 'sunset';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MessengerConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  theme: ChatTheme;
  custom_emoji: string;
  user1_nickname: string | null;
  user2_nickname: string | null;
  vanish_mode_enabled: boolean;
  vanish_mode_timeout_hours: number;
  encryption_enabled: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  other_user?: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    gender?: string;
    is_online?: boolean;
    last_seen?: string;
  };
  unread_count?: number;
  // Admin: other user deleted this conversation
  is_deleted_by_other?: boolean;
  deleted_by_other_at?: string;
}

export interface MessengerMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  voice_url: string | null;
  voice_duration_seconds: number | null;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  gif_id: string | null;
  sticker_id: string | null;
  reply_to_id: string | null;
  status: MessageStatus;
  delivered_at: string | null;
  read_at: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_for_everyone: boolean;
  is_vanishing: boolean;
  vanishes_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  // Joined data
  sender?: {
    username: string;
    avatar_url: string | null;
    gender?: string;
  };
  reply_to?: MessengerMessage | null;
  reactions?: MessengerReaction[];
  gif?: {
    id: string;
    url: string;
    shortcode: string;
  } | null;
}

export interface MessengerReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface MessengerTyping {
  id: string;
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}

export interface MessengerPreferences {
  id: string;
  user_id: string;
  show_read_receipts: boolean;
  show_typing_indicator: boolean;
  notification_sounds: boolean;
  notification_previews: boolean;
  auto_play_videos: boolean;
  auto_play_gifs: boolean;
  hd_media_wifi_only: boolean;
  created_at: string;
  updated_at: string;
}

// Group types
export interface MessengerGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  creator_id: string;
  theme: ChatTheme;
  custom_emoji: string;
  is_private: boolean;
  join_approval_required: boolean;
  vanish_mode_enabled: boolean;
  encryption_enabled: boolean;
  max_members: number;
  member_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  members?: MessengerGroupMember[];
  my_role?: 'admin' | 'moderator' | 'member';
  unread_count?: number;
}

export interface MessengerGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  nickname: string | null;
  can_send_messages: boolean;
  can_send_media: boolean;
  can_add_members: boolean;
  is_muted: boolean;
  muted_until: string | null;
  joined_at: string;
  invited_by: string | null;
  // Joined
  user?: {
    username: string;
    avatar_url: string | null;
    gender?: string;
    is_online?: boolean;
  };
}

export interface MessengerGroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  voice_url: string | null;
  voice_duration_seconds: number | null;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  gif_id: string | null;
  sticker_id: string | null;
  reply_to_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  is_vanishing: boolean;
  vanishes_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  // Joined
  sender?: {
    username: string;
    avatar_url: string | null;
    gender?: string;
  };
  reply_to?: MessengerGroupMessage | null;
  reactions?: MessengerGroupReaction[];
}

export interface MessengerGroupReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface MessengerGroupPoll {
  id: string;
  group_id: string;
  creator_id: string;
  question: string;
  options: PollOption[];
  is_anonymous: boolean;
  is_multiple_choice: boolean;
  ends_at: string | null;
  is_closed: boolean;
  created_at: string;
  // Computed
  total_votes?: number;
  my_votes?: string[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

// Theme colors mapping
export const CHAT_THEME_COLORS: Record<ChatTheme, { primary: string; gradient: string }> = {
  default: { primary: 'hsl(var(--primary))', gradient: 'from-primary to-primary/80' },
  love: { primary: '#FF4458', gradient: 'from-red-500 to-pink-500' },
  tie_dye: { primary: '#9B59B6', gradient: 'from-purple-500 via-pink-500 to-orange-500' },
  berry: { primary: '#8E44AD', gradient: 'from-purple-600 to-purple-400' },
  candy: { primary: '#FF69B4', gradient: 'from-pink-400 to-pink-300' },
  citrus: { primary: '#F39C12', gradient: 'from-orange-500 to-yellow-400' },
  tropical: { primary: '#1ABC9C', gradient: 'from-teal-500 to-emerald-400' },
  forest: { primary: '#27AE60', gradient: 'from-green-600 to-green-400' },
  ocean: { primary: '#3498DB', gradient: 'from-blue-500 to-cyan-400' },
  lavender: { primary: '#9B59B6', gradient: 'from-violet-500 to-purple-400' },
  rose: { primary: '#E74C3C', gradient: 'from-rose-500 to-red-400' },
  sunset: { primary: '#E67E22', gradient: 'from-orange-500 to-red-500' },
};

// Quick reactions
export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😠', '👍'];

// Edit/Delete time limits (in minutes)
export const EDIT_TIME_LIMIT_MINUTES = 15;
export const DELETE_TIME_LIMIT_MINUTES = 10;
