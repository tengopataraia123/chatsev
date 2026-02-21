// BIO Types

export interface BioContent {
  type: 'text' | 'emoji' | 'link' | 'hashtag' | 'mention';
  value: string;
  url?: string;
  style?: BioTextStyle;
}

export interface BioTextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  highlight?: string;
}

export interface UserBio {
  id: string;
  user_id: string;
  content: string;
  content_json: BioContent[];
  visibility: 'public' | 'friends' | 'hidden';
  created_at: string;
  updated_at: string;
}

export interface BioHistory {
  id: string;
  user_id: string;
  content: string;
  content_json: BioContent[];
  created_at: string;
}

export const BIO_MAX_LENGTH = 500;
export const BIO_MAX_LINES = 10;
export const BIO_HISTORY_LIMIT = 5;

export const EMOJI_ICONS = [
  '🎵', '🎮', '💼', '💔', '💡', '📍', '🔥', '❤️', '💜', '💙',
  '🌟', '✨', '🎯', '🎨', '📸', '🎬', '🎤', '🏆', '🌍', '✈️',
  '🎂', '💪', '🙏', '😊', '😎', '🥰', '😍', '🤗', '👀', '💫'
];

export const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ffffff', // white
  '#000000', // black
];

export const HIGHLIGHT_COLORS = [
  'rgba(239, 68, 68, 0.3)',  // red
  'rgba(249, 115, 22, 0.3)', // orange
  'rgba(234, 179, 8, 0.3)',  // yellow
  'rgba(34, 197, 94, 0.3)',  // green
  'rgba(6, 182, 212, 0.3)',  // cyan
  'rgba(59, 130, 246, 0.3)', // blue
  'rgba(139, 92, 246, 0.3)', // violet
  'rgba(236, 72, 153, 0.3)', // pink
];
