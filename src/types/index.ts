import { Tables } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;

export interface Story {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  isLive?: boolean;
  hasUnseenStory?: boolean;
  isAddStory?: boolean;
}

export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    isVerified?: boolean;
    gender?: string;
  };
  content?: string;
  image?: string;
  video?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: Date;
  // Group post info
  groupId?: string;
  groupName?: string;
  groupCoverUrl?: string;
  isGroupMember?: boolean;
  // Location info
  locationName?: string;
  locationFull?: string;
  locationLat?: number;
  locationLng?: number;
  locationSource?: 'manual' | 'gps' | 'provider';
  // Pinned post info
  isGloballyPinned?: boolean;
  globallyPinnedAt?: Date;
  // Mood info
  moodEmoji?: string;
  moodText?: string;
  moodType?: 'feeling' | 'activity';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  isGroup: boolean;
}
