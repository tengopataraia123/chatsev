export interface GroupCategory {
  id: string;
  parent_id: string | null;
  name_ka: string;
  name_en: string | null;
  name_ru: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Group {
  id: string;
  owner_user_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  description: string | null;
  privacy_type: 'public' | 'closed' | 'secret';
  group_slug: string;
  group_avatar_url: string | null;
  group_cover_url: string | null;
  is_featured: boolean;
  is_sponsored: boolean;
  member_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
  category?: GroupCategory | null;
  my_membership?: GroupMember | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'invited' | 'blocked';
  joined_at: string | null;
  invited_by_user_id: string | null;
  request_note: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    gender: string | null;
  };
}

export interface GroupSettings {
  id: string;
  group_id: string;
  who_can_view_posts: string;
  who_can_join: string;
  who_can_post: string;
  who_can_view_members: string;
  post_approval_required: boolean;
  enable_tabs: Record<string, boolean>;
  default_tab: string;
  invite_expiration_days: number;
  membership_questions: any[] | null;
  group_rules: string | null;
}

export interface GroupPostMedia {
  id: string;
  post_id: string;
  media_type: 'image' | 'video' | 'gif' | 'file';
  url: string;
  thumbnail_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  sort_order: number;
  meta_json: any;
  created_at: string;
}

export interface GroupPostPoll {
  id: string;
  post_id: string;
  question: string;
  is_multiple_choice: boolean;
  ends_at: string | null;
  total_votes: number;
  created_at: string;
  options?: GroupPostPollOption[];
  user_votes?: string[]; // option IDs user voted for
}

export interface GroupPostPollOption {
  id: string;
  poll_id: string;
  option_text: string;
  votes_count: number;
  sort_order: number;
}

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  post_type: 'normal' | 'question' | 'announcement';
  link_preview_json: any;
  location_name: string | null;
  is_approved: boolean;
  is_pinned: boolean;
  scheduled_at: string | null;
  status: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  author?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    gender: string | null;
  };
  media?: GroupPostMedia[];
  poll?: GroupPostPoll;
  reactions_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by_user_id: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  group?: Group;
  inviter?: {
    username: string;
    avatar_url: string | null;
  };
}

export type GroupTab = 'all' | 'my-groups' | 'joined' | 'friends' | 'invites';
export type GroupPrivacy = 'public' | 'closed' | 'secret';
