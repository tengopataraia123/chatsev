export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
}

export interface BlogPost {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_url?: string;
  category_id?: string;
  tags: string[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  is_featured: boolean;
  is_pinned: boolean;
  views_count: number;
  reading_time_minutes: number;
  approved_by?: string;
  approved_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: {
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  category?: BlogCategory;
  reactions_count?: number;
  comments_count?: number;
  shares_count?: number;
  user_reaction?: string;
  is_bookmarked?: boolean;
}

export interface BlogComment {
  id: string;
  blog_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  gif_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  };
  gif?: {
    file_original: string;
  };
  reactions_count?: number;
  user_reaction?: string;
  replies?: BlogComment[];
}

export interface BlogReaction {
  id: string;
  blog_id: string;
  user_id: string;
  reaction_type: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
  created_at: string;
}

export interface RecommendedArticle extends BlogPost {
  recommendation_score?: number;
  recommendation_reason?: string;
}
