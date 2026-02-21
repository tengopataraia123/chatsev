export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_comments: {
        Row: {
          activity_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_likes: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_points_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          points: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      ad_violations: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          detected_domain: string
          filtered_text: string
          id: string
          is_read: boolean
          original_text: string
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string
          detected_domain: string
          filtered_text: string
          id?: string
          is_read?: boolean
          original_text: string
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          detected_domain?: string
          filtered_text?: string
          id?: string
          is_read?: boolean
          original_text?: string
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_action_logs: {
        Row: {
          action_category: string
          action_type: string
          admin_id: string
          admin_role: string
          created_at: string
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          target_content_id: string | null
          target_content_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action_category: string
          action_type: string
          admin_id: string
          admin_role: string
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          admin_id?: string
          admin_role?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_content_id?: string | null
          target_content_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_message_audit: {
        Row: {
          action: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          receiver_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          action?: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          receiver_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          action?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          receiver_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      admin_ratings: {
        Row: {
          actions_count: number | null
          admin_id: string
          approvals_count: number | null
          blocks_count: number | null
          created_at: string
          deletions_count: number | null
          edits_count: number | null
          id: string
          last_action_at: string | null
          mutes_count: number | null
          other_actions_count: number | null
          rejections_count: number | null
          reviews_count: number | null
          total_score: number | null
          unblocks_count: number | null
          unmutes_count: number | null
          updated_at: string
          warnings_count: number | null
        }
        Insert: {
          actions_count?: number | null
          admin_id: string
          approvals_count?: number | null
          blocks_count?: number | null
          created_at?: string
          deletions_count?: number | null
          edits_count?: number | null
          id?: string
          last_action_at?: string | null
          mutes_count?: number | null
          other_actions_count?: number | null
          rejections_count?: number | null
          reviews_count?: number | null
          total_score?: number | null
          unblocks_count?: number | null
          unmutes_count?: number | null
          updated_at?: string
          warnings_count?: number | null
        }
        Update: {
          actions_count?: number | null
          admin_id?: string
          approvals_count?: number | null
          blocks_count?: number | null
          created_at?: string
          deletions_count?: number | null
          edits_count?: number | null
          id?: string
          last_action_at?: string | null
          mutes_count?: number | null
          other_actions_count?: number | null
          rejections_count?: number | null
          reviews_count?: number | null
          total_score?: number | null
          unblocks_count?: number | null
          unmutes_count?: number | null
          updated_at?: string
          warnings_count?: number | null
        }
        Relationships: []
      }
      ai_avatar_generations: {
        Row: {
          created_at: string
          error_message: string | null
          generated_image_url: string | null
          id: string
          prompt: string
          source_image_url: string | null
          status: string | null
          style: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generated_image_url?: string | null
          id?: string
          prompt: string
          source_image_url?: string | null
          status?: string | null
          style?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generated_image_url?: string | null
          id?: string
          prompt?: string
          source_image_url?: string | null
          status?: string | null
          style?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          browser_name: string | null
          created_at: string
          device_model: string | null
          device_type: string | null
          event_type: string
          first_landing_path: string | null
          geo_city: string | null
          geo_country: string | null
          id: string
          last_login_at: string | null
          last_login_ip: string | null
          os_name: string | null
          referrer_domain: string | null
          referrer_url: string | null
          registered_at: string | null
          registration_ip: string | null
          session_id: string | null
          updated_at: string
          user_agent_raw: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser_name?: string | null
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          event_type?: string
          first_landing_path?: string | null
          geo_city?: string | null
          geo_country?: string | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          os_name?: string | null
          referrer_domain?: string | null
          referrer_url?: string | null
          registered_at?: string | null
          registration_ip?: string | null
          session_id?: string | null
          updated_at?: string
          user_agent_raw?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser_name?: string | null
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          event_type?: string
          first_landing_path?: string | null
          geo_city?: string | null
          geo_country?: string | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          os_name?: string | null
          referrer_domain?: string | null
          referrer_url?: string | null
          registered_at?: string | null
          registration_ip?: string | null
          session_id?: string | null
          updated_at?: string
          user_agent_raw?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      analytics_ip_blocks: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          id: string
          ip_address: string
          is_active: boolean | null
          reason: string | null
          unblocked_at: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          ip_address: string
          is_active?: boolean | null
          reason?: string | null
          unblocked_at?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean | null
          reason?: string | null
          unblocked_at?: string | null
        }
        Relationships: []
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          public_url: string
          storage_path: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          public_url: string
          storage_path: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          public_url?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "announcement_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          content: string
          created_at: string
          id: string
          is_edited: boolean | null
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "announcement_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_user_state: {
        Row: {
          announcement_id: string
          created_at: string
          dismissed_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          read_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          read_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          read_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_user_state_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["announcement_audience"]
          content_html: string
          content_json: Json | null
          created_at: string
          created_by: string
          id: string
          priority: number
          publish_as_system: boolean | null
          publish_end: string | null
          publish_start: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          content_html: string
          content_json?: Json | null
          created_at?: string
          created_by: string
          id?: string
          priority?: number
          publish_as_system?: boolean | null
          publish_end?: string | null
          publish_start?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          content_html?: string
          content_json?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          priority?: number
          publish_as_system?: boolean | null
          publish_end?: string | null
          publish_start?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      anonymous_question_likes: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_question_likes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "anonymous_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string
          id: string
          is_anonymous: boolean | null
          is_public: boolean | null
          likes_count: number | null
          question: string
          recipient_id: string
          sender_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          question: string
          recipient_id: string
          sender_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          question?: string
          recipient_id?: string
          sender_id?: string | null
        }
        Relationships: []
      }
      app_module_permissions: {
        Row: {
          created_at: string | null
          id: string
          min_role: string | null
          module_id: string
          permission_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_role?: string | null
          module_id: string
          permission_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          min_role?: string | null
          module_id?: string
          permission_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      app_modules: {
        Row: {
          allowed_genders: string[] | null
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_enabled: boolean | null
          is_visible: boolean | null
          min_age: number | null
          name: string
          requires_auth: boolean | null
          settings: Json | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_genders?: string[] | null
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          is_visible?: boolean | null
          min_age?: number | null
          name: string
          requires_auth?: boolean | null
          settings?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_genders?: string[] | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          is_visible?: boolean | null
          min_age?: number | null
          name?: string
          requires_auth?: boolean | null
          settings?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          display_name: string
          icon: string
          id: string
          is_active: boolean | null
          name: string
          points_required: number | null
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          points_required?: number | null
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      bets: {
        Row: {
          amount: number
          away_team: string
          bet_type: string
          commence_time: string
          created_at: string
          home_team: string
          id: string
          match_id: string
          odds: number
          potential_win: number
          settled_at: string | null
          sport_key: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          away_team: string
          bet_type: string
          commence_time: string
          created_at?: string
          home_team: string
          id?: string
          match_id: string
          odds: number
          potential_win: number
          settled_at?: string | null
          sport_key: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          away_team?: string
          bet_type?: string
          commence_time?: string
          created_at?: string
          home_team?: string
          id?: string
          match_id?: string
          odds?: number
          potential_win?: number
          settled_at?: string | null
          sport_key?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      bio_history: {
        Row: {
          content: string
          content_json: Json | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          content_json?: Json | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          content_json?: Json | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_domains: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      blocked_words: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          updated_at: string
          word: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          word: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      blog_bookmarks: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_bookmarks_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          blog_id: string
          content: string
          created_at: string
          gif_id: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blog_id: string
          content: string
          created_at?: string
          gif_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          content?: string
          created_at?: string
          gif_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean | null
          is_pinned: boolean | null
          published_at: string | null
          reading_time_minutes: number | null
          rejection_reason: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          published_at?: string | null
          reading_time_minutes?: number | null
          rejection_reason?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          published_at?: string | null
          reading_time_minutes?: number | null
          rejection_reason?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_reactions: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_reactions_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_reports: {
        Row: {
          blog_id: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          blog_id: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          blog_id?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_reports_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_shares: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          share_type: string | null
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          share_type?: string | null
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          share_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_shares_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_views: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          reading_progress: number | null
          time_spent_seconds: number | null
          user_id: string | null
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          reading_progress?: number | null
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          reading_progress?: number | null
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_views_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      bura_games: {
        Row: {
          created_at: string
          current_turn: string | null
          id: string
          player1_id: string
          player2_id: string
          state: Json
          status: string
          table_id: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          current_turn?: string | null
          id?: string
          player1_id: string
          player2_id: string
          state?: Json
          status?: string
          table_id?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          current_turn?: string | null
          id?: string
          player1_id?: string
          player2_id?: string
          state?: Json
          status?: string
          table_id?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bura_games_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "bura_lobby_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      bura_lobby_tables: {
        Row: {
          bet_amount: number | null
          created_at: string | null
          game_id: string | null
          id: string
          player1_id: string | null
          player1_username: string | null
          player2_id: string | null
          player2_username: string | null
          status: string
          table_number: number
          updated_at: string | null
        }
        Insert: {
          bet_amount?: number | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          status?: string
          table_number: number
          updated_at?: string | null
        }
        Update: {
          bet_amount?: number | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          status?: string
          table_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          call_id: string
          created_at: string
          from_user_id: string
          id: string
          processed: boolean | null
          signal_data: Json | null
          signal_type: string
          to_user_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          from_user_id: string
          id?: string
          processed?: boolean | null
          signal_data?: Json | null
          signal_type: string
          to_user_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          processed?: boolean | null
          signal_data?: Json | null
          signal_type?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_type: string
          caller_id: string
          created_at: string
          duration_seconds: number | null
          end_reason: string | null
          ended_at: string | null
          id: string
          receiver_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          call_type: string
          caller_id: string
          created_at?: string
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          receiver_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          created_at?: string
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          receiver_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          content: string | null
          created_at: string
          id: string
          is_winner: boolean | null
          media_type: string | null
          media_url: string | null
          status: string | null
          user_id: string
          votes_count: number | null
        }
        Insert: {
          challenge_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_winner?: boolean | null
          media_type?: string | null
          media_url?: string | null
          status?: string | null
          user_id: string
          votes_count?: number | null
        }
        Update: {
          challenge_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_winner?: boolean | null
          media_type?: string | null
          media_url?: string | null
          status?: string | null
          user_id?: string
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          created_at: string
          id: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          reward_points: number | null
          rules: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          challenge_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          reward_points?: number | null
          rules?: string | null
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          challenge_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          reward_points?: number | null
          rules?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cleanup_items: {
        Row: {
          created_at: string
          default_batch_size: number
          default_pause_ms: number
          description_ka: string | null
          enabled: boolean
          id: string
          key: string
          namespace_prefix: string | null
          path_pattern: string | null
          query_template: string | null
          retention_days: number | null
          risk_level: Database["public"]["Enums"]["cleanup_risk_level"]
          title_ka: string
          type: Database["public"]["Enums"]["cleanup_item_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_batch_size?: number
          default_pause_ms?: number
          description_ka?: string | null
          enabled?: boolean
          id?: string
          key: string
          namespace_prefix?: string | null
          path_pattern?: string | null
          query_template?: string | null
          retention_days?: number | null
          risk_level?: Database["public"]["Enums"]["cleanup_risk_level"]
          title_ka: string
          type?: Database["public"]["Enums"]["cleanup_item_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_batch_size?: number
          default_pause_ms?: number
          description_ka?: string | null
          enabled?: boolean
          id?: string
          key?: string
          namespace_prefix?: string | null
          path_pattern?: string | null
          query_template?: string | null
          retention_days?: number | null
          risk_level?: Database["public"]["Enums"]["cleanup_risk_level"]
          title_ka?: string
          type?: Database["public"]["Enums"]["cleanup_item_type"]
          updated_at?: string
        }
        Relationships: []
      }
      cleanup_runs: {
        Row: {
          checkpoint_json: Json | null
          cleanup_item_id: string
          finished_at: string | null
          id: string
          last_error: string | null
          processed_batches: number
          processed_count: number
          retry_after: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["cleanup_run_status"]
          updated_at: string
        }
        Insert: {
          checkpoint_json?: Json | null
          cleanup_item_id: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          processed_batches?: number
          processed_count?: number
          retry_after?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["cleanup_run_status"]
          updated_at?: string
        }
        Update: {
          checkpoint_json?: Json | null
          cleanup_item_id?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          processed_batches?: number
          processed_count?: number
          retry_after?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["cleanup_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_runs_cleanup_item_id_fkey"
            columns: ["cleanup_item_id"]
            isOneToOne: false
            referencedRelation: "cleanup_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      close_friends: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_replies: {
        Row: {
          comment_id: string
          content: string
          created_at: string
          gif_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          content: string
          created_at?: string
          gif_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          content?: string
          created_at?: string
          gif_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_replies_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_replies_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
        ]
      }
      confession_comments: {
        Row: {
          confession_id: string
          content: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          user_id: string
        }
        Insert: {
          confession_id: string
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          user_id: string
        }
        Update: {
          confession_id?: string
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confession_comments_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      confession_reactions: {
        Row: {
          confession_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          confession_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          confession_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confession_reactions_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
        ]
      }
      confessions: {
        Row: {
          category: string | null
          comments_count: number | null
          content: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          is_featured: boolean | null
          mood: string | null
          reactions_count: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_featured?: boolean | null
          mood?: string | null
          reactions_count?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_featured?: boolean | null
          mood?: string | null
          reactions_count?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_call_settings: {
        Row: {
          calls_enabled: boolean
          conversation_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_enabled?: boolean
          conversation_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_enabled?: boolean
          conversation_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_call_settings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_user_state: {
        Row: {
          cleared_at: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_cleared: boolean | null
          is_deleted: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cleared_at?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_cleared?: boolean | null
          is_deleted?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cleared_at?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_cleared?: boolean | null
          is_deleted?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_user_state_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      daily_fact_likes: {
        Row: {
          created_at: string | null
          fact_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fact_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fact_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_fact_likes_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "daily_facts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_facts: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          display_date: string | null
          fact_text: string
          id: string
          is_featured: boolean | null
          likes_count: number | null
          source: string | null
          views_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          display_date?: string | null
          fact_text: string
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          source?: string | null
          views_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          display_date?: string | null
          fact_text?: string
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          source?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      dating_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      dating_daily_picks: {
        Row: {
          compatibility_score: number | null
          created_at: string
          id: string
          is_liked: boolean | null
          is_viewed: boolean | null
          pick_date: string
          picked_user_id: string
          user_id: string
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string
          id?: string
          is_liked?: boolean | null
          is_viewed?: boolean | null
          pick_date?: string
          picked_user_id: string
          user_id: string
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string
          id?: string
          is_liked?: boolean | null
          is_viewed?: boolean | null
          pick_date?: string
          picked_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      dating_likes: {
        Row: {
          created_at: string
          id: string
          is_super_like: boolean | null
          liked_id: string
          liker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_super_like?: boolean | null
          liked_id: string
          liker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_super_like?: boolean | null
          liked_id?: string
          liker_id?: string
        }
        Relationships: []
      }
      dating_matches: {
        Row: {
          id: string
          is_active: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          matched_at: string
          unread_count_user1: number | null
          unread_count_user2: number | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          matched_at?: string
          unread_count_user1?: number | null
          unread_count_user2?: number | null
          user1_id: string
          user2_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          matched_at?: string
          unread_count_user1?: number | null
          unread_count_user2?: number | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      dating_messages: {
        Row: {
          content: string | null
          created_at: string
          gif_id: string | null
          id: string
          image_url: string | null
          is_deleted: boolean | null
          is_read: boolean | null
          match_id: string
          read_at: string | null
          sender_id: string
          voice_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          is_read?: boolean | null
          match_id: string
          read_at?: string | null
          sender_id: string
          voice_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          is_read?: boolean | null
          match_id?: string
          read_at?: string | null
          sender_id?: string
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dating_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dating_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "dating_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      dating_presence: {
        Row: {
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dating_profile_views: {
        Row: {
          id: string
          viewed_at: string
          viewed_id: string
          viewer_id: string
        }
        Insert: {
          id?: string
          viewed_at?: string
          viewed_id: string
          viewer_id: string
        }
        Update: {
          id?: string
          viewed_at?: string
          viewed_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      dating_profiles: {
        Row: {
          bio: string | null
          boost_count: number | null
          boost_expires_at: string | null
          city: string | null
          country: string | null
          created_at: string
          distance_pref_km: number | null
          drinking: string | null
          education: string | null
          has_children: string | null
          height: number | null
          id: string
          impressions_count: number | null
          interests: string[] | null
          is_active: boolean | null
          is_boosted: boolean | null
          is_hidden: boolean | null
          is_verified: boolean | null
          last_active_at: string | null
          last_rewind_reset: string | null
          latitude: number | null
          longitude: number | null
          looking_for: string | null
          max_age: number | null
          min_age: number | null
          occupation: string | null
          photos: string[] | null
          profile_completion_pct: number | null
          relationship_status: string | null
          rewinds_used_today: number | null
          show_only_verified: boolean | null
          smoking: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          bio?: string | null
          boost_count?: number | null
          boost_expires_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          distance_pref_km?: number | null
          drinking?: string | null
          education?: string | null
          has_children?: string | null
          height?: number | null
          id?: string
          impressions_count?: number | null
          interests?: string[] | null
          is_active?: boolean | null
          is_boosted?: boolean | null
          is_hidden?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_rewind_reset?: string | null
          latitude?: number | null
          longitude?: number | null
          looking_for?: string | null
          max_age?: number | null
          min_age?: number | null
          occupation?: string | null
          photos?: string[] | null
          profile_completion_pct?: number | null
          relationship_status?: string | null
          rewinds_used_today?: number | null
          show_only_verified?: boolean | null
          smoking?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          bio?: string | null
          boost_count?: number | null
          boost_expires_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          distance_pref_km?: number | null
          drinking?: string | null
          education?: string | null
          has_children?: string | null
          height?: number | null
          id?: string
          impressions_count?: number | null
          interests?: string[] | null
          is_active?: boolean | null
          is_boosted?: boolean | null
          is_hidden?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_rewind_reset?: string | null
          latitude?: number | null
          longitude?: number | null
          looking_for?: string | null
          max_age?: number | null
          min_age?: number | null
          occupation?: string | null
          photos?: string[] | null
          profile_completion_pct?: number | null
          relationship_status?: string | null
          rewinds_used_today?: number | null
          show_only_verified?: boolean | null
          smoking?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      dating_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      dating_rewind_history: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_used: boolean | null
          target_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_used?: boolean | null
          target_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_used?: boolean | null
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      dating_super_likes: {
        Row: {
          id: string
          target_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          target_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          target_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dating_swipes: {
        Row: {
          created_at: string
          direction: string
          id: string
          swiped_id: string
          swiper_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          swiped_id: string
          swiper_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          swiped_id?: string
          swiper_id?: string
        }
        Relationships: []
      }
      dating_typing_status: {
        Row: {
          id: string
          is_typing: boolean | null
          match_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_typing?: boolean | null
          match_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_typing?: boolean | null
          match_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dating_typing_status_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "dating_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      dating_verifications: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      device_accounts: {
        Row: {
          browser_name: string | null
          device_fingerprint: string
          device_type: string | null
          first_seen_at: string
          geo_city: string | null
          geo_country: string | null
          geo_region: string | null
          geo_updated_at: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          user_agent: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          browser_name?: string | null
          device_fingerprint: string
          device_type?: string | null
          first_seen_at?: string
          geo_city?: string | null
          geo_country?: string | null
          geo_region?: string | null
          geo_updated_at?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          browser_name?: string | null
          device_fingerprint?: string
          device_type?: string | null
          first_seen_at?: string
          geo_city?: string | null
          geo_country?: string | null
          geo_region?: string | null
          geo_updated_at?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      dismissed_friend_suggestions: {
        Row: {
          created_at: string
          dismissed_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      dj_fallback_playlist: {
        Row: {
          artist: string | null
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          id: string
          position: number | null
          room_id: string
          thumbnail_url: string | null
          title: string | null
          youtube_video_id: string
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          id?: string
          position?: number | null
          room_id: string
          thumbnail_url?: string | null
          title?: string | null
          youtube_video_id: string
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          id?: string
          position?: number | null
          room_id?: string
          thumbnail_url?: string | null
          title?: string | null
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_fallback_playlist_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dj_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_play_history: {
        Row: {
          artist: string | null
          duration_ms: number | null
          id: string
          played_at: string | null
          requested_by_user_id: string | null
          room_id: string
          skip_reason: string | null
          title: string
          track_id: string | null
          youtube_video_id: string | null
        }
        Insert: {
          artist?: string | null
          duration_ms?: number | null
          id?: string
          played_at?: string | null
          requested_by_user_id?: string | null
          room_id: string
          skip_reason?: string | null
          title: string
          track_id?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          artist?: string | null
          duration_ms?: number | null
          id?: string
          played_at?: string | null
          requested_by_user_id?: string | null
          room_id?: string
          skip_reason?: string | null
          title?: string
          track_id?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_play_history_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dj_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dj_play_history_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "dj_room_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_room_messages: {
        Row: {
          content: string | null
          created_at: string
          gif_id: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_private: boolean
          private_to_user_id: string | null
          reply_to_id: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_private?: boolean
          private_to_user_id?: string | null
          reply_to_id?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_private?: boolean
          private_to_user_id?: string | null
          reply_to_id?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_room_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dj_room_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "dj_room_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_room_playlist: {
        Row: {
          added_by: string
          artist: string | null
          created_at: string
          id: string
          is_played: boolean
          is_playing: boolean
          play_order: number
          title: string
          url: string | null
        }
        Insert: {
          added_by: string
          artist?: string | null
          created_at?: string
          id?: string
          is_played?: boolean
          is_playing?: boolean
          play_order?: number
          title: string
          url?: string | null
        }
        Update: {
          added_by?: string
          artist?: string | null
          created_at?: string
          id?: string
          is_played?: boolean
          is_playing?: boolean
          play_order?: number
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      dj_room_presence: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dj_room_queue: {
        Row: {
          added_at: string | null
          added_by: string
          id: string
          position: number
          room_id: string
          round_robin_position: number | null
          status: string
          track_id: string
        }
        Insert: {
          added_at?: string | null
          added_by: string
          id?: string
          position?: number
          room_id: string
          round_robin_position?: number | null
          status?: string
          track_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string
          id?: string
          position?: number
          room_id?: string
          round_robin_position?: number | null
          status?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_room_queue_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "dj_room_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_room_requests: {
        Row: {
          artist: string | null
          created_at: string | null
          dedication: string | null
          from_user_id: string
          handled_at: string | null
          handled_by: string | null
          id: string
          message: string | null
          rejection_reason: string | null
          room_id: string
          song_title: string
          status: string
          youtube_link: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          dedication?: string | null
          from_user_id: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message?: string | null
          rejection_reason?: string | null
          room_id: string
          song_title: string
          status?: string
          youtube_link?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          dedication?: string | null
          from_user_id?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message?: string | null
          rejection_reason?: string | null
          room_id?: string
          song_title?: string
          status?: string
          youtube_link?: string | null
        }
        Relationships: []
      }
      dj_room_settings: {
        Row: {
          autoplay_enabled: boolean | null
          created_at: string | null
          fallback_enabled: boolean | null
          id: string
          max_queue_per_user: number | null
          room_id: string
          round_robin_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          autoplay_enabled?: boolean | null
          created_at?: string | null
          fallback_enabled?: boolean | null
          id?: string
          max_queue_per_user?: number | null
          room_id: string
          round_robin_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          autoplay_enabled?: boolean | null
          created_at?: string | null
          fallback_enabled?: boolean | null
          id?: string
          max_queue_per_user?: number | null
          room_id?: string
          round_robin_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_room_settings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "dj_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_room_state: {
        Row: {
          current_track_id: string | null
          id: string
          mode: string
          paused: boolean | null
          paused_at: string | null
          playback_url: string | null
          room_id: string
          seek_base_ms: number | null
          source_type: string | null
          started_at: string | null
          updated_at: string | null
          updated_by: string | null
          volume: number | null
          youtube_video_id: string | null
        }
        Insert: {
          current_track_id?: string | null
          id?: string
          mode?: string
          paused?: boolean | null
          paused_at?: string | null
          playback_url?: string | null
          room_id: string
          seek_base_ms?: number | null
          source_type?: string | null
          started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
          volume?: number | null
          youtube_video_id?: string | null
        }
        Update: {
          current_track_id?: string | null
          id?: string
          mode?: string
          paused?: boolean | null
          paused_at?: string | null
          playback_url?: string | null
          room_id?: string
          seek_base_ms?: number | null
          source_type?: string | null
          started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
          volume?: number | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      dj_room_tracks: {
        Row: {
          artist: string | null
          created_at: string | null
          created_by: string
          dedication: string | null
          dislikes_count: number | null
          duration_ms: number | null
          id: string
          likes_count: number | null
          requested_by_user_id: string | null
          room_id: string
          source_type: string
          thumbnail_url: string | null
          title: string
          url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          created_by: string
          dedication?: string | null
          dislikes_count?: number | null
          duration_ms?: number | null
          id?: string
          likes_count?: number | null
          requested_by_user_id?: string | null
          room_id: string
          source_type: string
          thumbnail_url?: string | null
          title: string
          url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          created_by?: string
          dedication?: string | null
          dislikes_count?: number | null
          duration_ms?: number | null
          id?: string
          likes_count?: number | null
          requested_by_user_id?: string | null
          room_id?: string
          source_type?: string
          thumbnail_url?: string | null
          title?: string
          url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      dj_rooms: {
        Row: {
          backup_dj_user_id: string | null
          created_at: string | null
          dj_user_id: string | null
          id: string
          is_live: boolean | null
          listener_count: number | null
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          backup_dj_user_id?: string | null
          created_at?: string | null
          dj_user_id?: string | null
          id?: string
          is_live?: boolean | null
          listener_count?: number | null
          name?: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          backup_dj_user_id?: string | null
          created_at?: string | null
          dj_user_id?: string | null
          id?: string
          is_live?: boolean | null
          listener_count?: number | null
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dj_track_reactions: {
        Row: {
          created_at: string | null
          id: string
          reaction_type: string
          room_id: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction_type: string
          room_id: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction_type?: string
          room_id?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_track_reactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dj_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dj_track_reactions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "dj_room_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_user_queue_stats: {
        Row: {
          current_queue_count: number | null
          id: string
          is_muted: boolean | null
          last_added_at: string | null
          muted_until: string | null
          room_id: string
          total_played: number | null
          user_id: string
        }
        Insert: {
          current_queue_count?: number | null
          id?: string
          is_muted?: boolean | null
          last_added_at?: string | null
          muted_until?: string | null
          room_id: string
          total_played?: number | null
          user_id: string
        }
        Update: {
          current_queue_count?: number | null
          id?: string
          is_muted?: boolean | null
          last_added_at?: string | null
          muted_until?: string | null
          room_id?: string
          total_played?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_user_queue_stats_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dj_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      domino_lobby_tables: {
        Row: {
          bet_amount: number | null
          created_at: string | null
          game_id: string | null
          id: string
          player1_id: string | null
          player1_username: string | null
          player2_id: string | null
          player2_username: string | null
          status: string
          table_number: number
          updated_at: string | null
        }
        Insert: {
          bet_amount?: number | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          status?: string
          table_number: number
          updated_at?: string | null
        }
        Update: {
          bet_amount?: number | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          status?: string
          table_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      durak_active_games: {
        Row: {
          attacker_id: string
          created_at: string
          deck: Json
          defender_id: string
          discard_pile: Json
          id: string
          loser_id: string | null
          phase: string
          player1_hand: Json
          player1_id: string
          player2_hand: Json
          player2_id: string
          status: string
          table_cards: Json
          table_id: string
          trump_card: Json | null
          trump_suit: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          attacker_id: string
          created_at?: string
          deck?: Json
          defender_id: string
          discard_pile?: Json
          id?: string
          loser_id?: string | null
          phase?: string
          player1_hand?: Json
          player1_id: string
          player2_hand?: Json
          player2_id: string
          status?: string
          table_cards?: Json
          table_id: string
          trump_card?: Json | null
          trump_suit?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          attacker_id?: string
          created_at?: string
          deck?: Json
          defender_id?: string
          discard_pile?: Json
          id?: string
          loser_id?: string | null
          phase?: string
          player1_hand?: Json
          player1_id?: string
          player2_hand?: Json
          player2_id?: string
          status?: string
          table_cards?: Json
          table_id?: string
          trump_card?: Json | null
          trump_suit?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "durak_active_games_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "durak_lobby_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      durak_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "durak_chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      durak_games: {
        Row: {
          created_at: string
          ended_at: string | null
          game_variant: string
          id: string
          loser_id: string | null
          players: Json
          room_id: string | null
          started_at: string
          total_rounds: number | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          game_variant?: string
          id?: string
          loser_id?: string | null
          players?: Json
          room_id?: string | null
          started_at?: string
          total_rounds?: number | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          game_variant?: string
          id?: string
          loser_id?: string | null
          players?: Json
          room_id?: string | null
          started_at?: string
          total_rounds?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "durak_games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      durak_lobby_tables: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          player1_id: string | null
          player1_username: string | null
          player2_id: string | null
          player2_username: string | null
          status: string
          table_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          status?: string
          table_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          status?: string
          table_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      emigrants_room_messages: {
        Row: {
          content: string | null
          created_at: string
          gif_id: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_private: boolean
          private_to_user_id: string | null
          reply_to_id: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_private?: boolean
          private_to_user_id?: string | null
          reply_to_id?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_private?: boolean
          private_to_user_id?: string | null
          reply_to_id?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emigrants_room_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emigrants_room_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "emigrants_room_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      emigrants_room_presence: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          is_completed: boolean | null
          joined_at: string
          progress_value: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          is_completed?: boolean | null
          joined_at?: string
          progress_value?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          is_completed?: boolean | null
          joined_at?: string
          progress_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          participants_count: number | null
          reward_points: number | null
          start_date: string
          target_value: number
          title: string
        }
        Insert: {
          challenge_type: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          participants_count?: number | null
          reward_points?: number | null
          start_date: string
          target_value: number
          title: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          participants_count?: number | null
          reward_points?: number | null
          start_date?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          created_at: string
          current_value: number | null
          end_date: string
          goal_type: string
          id: string
          is_completed: boolean | null
          start_date: string
          target_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          end_date: string
          goal_type: string
          id?: string
          is_completed?: boolean | null
          start_date?: string
          target_value: number
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          end_date?: string
          goal_type?: string
          id?: string
          is_completed?: boolean | null
          start_date?: string
          target_value?: number
          user_id?: string
        }
        Relationships: []
      }
      fm_challenges: {
        Row: {
          accepted_at: string | null
          challenged_club_id: string
          challenged_score: number | null
          challenged_user_id: string
          challenger_club_id: string
          challenger_score: number | null
          challenger_user_id: string
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          match_result: Json | null
          status: string | null
          strength_gained: number | null
          winner_club_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          challenged_club_id: string
          challenged_score?: number | null
          challenged_user_id: string
          challenger_club_id: string
          challenger_score?: number | null
          challenger_user_id: string
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          match_result?: Json | null
          status?: string | null
          strength_gained?: number | null
          winner_club_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          challenged_club_id?: string
          challenged_score?: number | null
          challenged_user_id?: string
          challenger_club_id?: string
          challenger_score?: number | null
          challenger_user_id?: string
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          match_result?: Json | null
          status?: string | null
          strength_gained?: number | null
          winner_club_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fm_challenges_challenged_club_id_fkey"
            columns: ["challenged_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_challenges_challenger_club_id_fkey"
            columns: ["challenger_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_challenges_winner_club_id_fkey"
            columns: ["winner_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_club_coach: {
        Row: {
          bought_at: string
          club_id: string
          coach_id: string
          id: string
        }
        Insert: {
          bought_at?: string
          club_id: string
          coach_id: string
          id?: string
        }
        Update: {
          bought_at?: string
          club_id?: string
          coach_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_club_coach_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_club_coach_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: true
            referencedRelation: "fm_coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_club_players: {
        Row: {
          bought_at: string
          club_id: string
          id: string
          player_id: string
          role: string
          slot_code: string | null
        }
        Insert: {
          bought_at?: string
          club_id: string
          id?: string
          player_id: string
          role?: string
          slot_code?: string | null
        }
        Update: {
          bought_at?: string
          club_id?: string
          id?: string
          player_id?: string
          role?: string
          slot_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fm_club_players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_club_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "fm_players"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_clubs: {
        Row: {
          badge_url: string | null
          budget: number
          created_at: string
          fans_count: number
          id: string
          league_wins: number
          level: number
          name: string
          owner_id: string
          primary_color: string | null
          secondary_color: string | null
          stadium_id: string | null
          strength: number | null
          total_draws: number
          total_losses: number
          total_wins: number
          updated_at: string
        }
        Insert: {
          badge_url?: string | null
          budget?: number
          created_at?: string
          fans_count?: number
          id?: string
          league_wins?: number
          level?: number
          name: string
          owner_id: string
          primary_color?: string | null
          secondary_color?: string | null
          stadium_id?: string | null
          strength?: number | null
          total_draws?: number
          total_losses?: number
          total_wins?: number
          updated_at?: string
        }
        Update: {
          badge_url?: string | null
          budget?: number
          created_at?: string
          fans_count?: number
          id?: string
          league_wins?: number
          level?: number
          name?: string
          owner_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          stadium_id?: string | null
          strength?: number | null
          total_draws?: number
          total_losses?: number
          total_wins?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_clubs_stadium_id_fkey"
            columns: ["stadium_id"]
            isOneToOne: false
            referencedRelation: "fm_stadiums"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_coaches: {
        Row: {
          avatar_url: string | null
          bonuses: Json | null
          created_at: string
          id: string
          level: number
          name: string
          nation: string
          price: number
          salary: number
          style: string
        }
        Insert: {
          avatar_url?: string | null
          bonuses?: Json | null
          created_at?: string
          id?: string
          level: number
          name: string
          nation: string
          price?: number
          salary?: number
          style: string
        }
        Update: {
          avatar_url?: string | null
          bonuses?: Json | null
          created_at?: string
          id?: string
          level?: number
          name?: string
          nation?: string
          price?: number
          salary?: number
          style?: string
        }
        Relationships: []
      }
      fm_fixtures: {
        Row: {
          away_club_id: string
          created_at: string
          home_club_id: string
          id: string
          league_id: string
          match_day: number
          round: number
          scheduled_date: string | null
          status: string
        }
        Insert: {
          away_club_id: string
          created_at?: string
          home_club_id: string
          id?: string
          league_id: string
          match_day: number
          round: number
          scheduled_date?: string | null
          status?: string
        }
        Update: {
          away_club_id?: string
          created_at?: string
          home_club_id?: string
          id?: string
          league_id?: string
          match_day?: number
          round?: number
          scheduled_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_fixtures_away_club_id_fkey"
            columns: ["away_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_fixtures_home_club_id_fkey"
            columns: ["home_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_fixtures_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "fm_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_league_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          league_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          league_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          league_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_league_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "fm_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_leagues: {
        Row: {
          created_at: string
          created_by: string
          format: string
          id: string
          matches_per_day: number
          name: string
          start_date: string | null
          status: string
          teams_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          format?: string
          id?: string
          matches_per_day?: number
          name: string
          start_date?: string | null
          status?: string
          teams_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          format?: string
          id?: string
          matches_per_day?: number
          name?: string
          start_date?: string | null
          status?: string
          teams_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      fm_live_matches: {
        Row: {
          attendance: number
          away_club_id: string
          away_formation: Json | null
          away_goals: number
          ball_position: Json | null
          challenge_id: string | null
          created_at: string
          current_minute: number
          ended_at: string | null
          fixture_id: string | null
          half: number
          home_club_id: string
          home_formation: Json | null
          home_goals: number
          id: string
          player_positions: Json | null
          started_at: string | null
          status: string
          stoppage_time: number
          updated_at: string
        }
        Insert: {
          attendance?: number
          away_club_id: string
          away_formation?: Json | null
          away_goals?: number
          ball_position?: Json | null
          challenge_id?: string | null
          created_at?: string
          current_minute?: number
          ended_at?: string | null
          fixture_id?: string | null
          half?: number
          home_club_id: string
          home_formation?: Json | null
          home_goals?: number
          id?: string
          player_positions?: Json | null
          started_at?: string | null
          status?: string
          stoppage_time?: number
          updated_at?: string
        }
        Update: {
          attendance?: number
          away_club_id?: string
          away_formation?: Json | null
          away_goals?: number
          ball_position?: Json | null
          challenge_id?: string | null
          created_at?: string
          current_minute?: number
          ended_at?: string | null
          fixture_id?: string | null
          half?: number
          home_club_id?: string
          home_formation?: Json | null
          home_goals?: number
          id?: string
          player_positions?: Json | null
          started_at?: string | null
          status?: string
          stoppage_time?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_live_matches_away_club_id_fkey"
            columns: ["away_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_live_matches_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fm_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_live_matches_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fm_fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_live_matches_home_club_id_fkey"
            columns: ["home_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_match_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          match_id: string
          minute: number
          player_id: string | null
          position: Json | null
          secondary_player_id: string | null
          team: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          match_id: string
          minute: number
          player_id?: string | null
          position?: Json | null
          secondary_player_id?: string | null
          team: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          match_id?: string
          minute?: number
          player_id?: string | null
          position?: Json | null
          secondary_player_id?: string | null
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "fm_live_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "fm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_match_events_secondary_player_id_fkey"
            columns: ["secondary_player_id"]
            isOneToOne: false
            referencedRelation: "fm_players"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_match_results: {
        Row: {
          away_goals: number
          events: Json | null
          fixture_id: string
          home_goals: number
          id: string
          played_at: string
          stats: Json | null
        }
        Insert: {
          away_goals?: number
          events?: Json | null
          fixture_id: string
          home_goals?: number
          id?: string
          played_at?: string
          stats?: Json | null
        }
        Update: {
          away_goals?: number
          events?: Json | null
          fixture_id?: string
          home_goals?: number
          id?: string
          played_at?: string
          stats?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fm_match_results_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: true
            referencedRelation: "fm_fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_match_substitutions: {
        Row: {
          club_id: string
          created_at: string
          id: string
          match_id: string
          minute: number
          player_in_id: string
          player_out_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          match_id: string
          minute: number
          player_in_id: string
          player_out_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          match_id?: string
          minute?: number
          player_in_id?: string
          player_out_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_match_substitutions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_match_substitutions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "fm_live_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_match_substitutions_player_in_id_fkey"
            columns: ["player_in_id"]
            isOneToOne: false
            referencedRelation: "fm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_match_substitutions_player_out_id_fkey"
            columns: ["player_out_id"]
            isOneToOne: false
            referencedRelation: "fm_players"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_players: {
        Row: {
          age: number
          avatar_url: string | null
          created_at: string
          current_club: string | null
          foot: string
          form: number
          id: string
          initial_ovr: number | null
          injury_status: string | null
          market_multiplier: number | null
          name: string
          nation: string
          ovr: number
          position: string
          potential: number
          price: number
          salary: number
          secondary_position: string | null
          stamina: number
          stats: Json
        }
        Insert: {
          age: number
          avatar_url?: string | null
          created_at?: string
          current_club?: string | null
          foot?: string
          form?: number
          id?: string
          initial_ovr?: number | null
          injury_status?: string | null
          market_multiplier?: number | null
          name: string
          nation: string
          ovr: number
          position: string
          potential: number
          price?: number
          salary?: number
          secondary_position?: string | null
          stamina?: number
          stats?: Json
        }
        Update: {
          age?: number
          avatar_url?: string | null
          created_at?: string
          current_club?: string | null
          foot?: string
          form?: number
          id?: string
          initial_ovr?: number | null
          injury_status?: string | null
          market_multiplier?: number | null
          name?: string
          nation?: string
          ovr?: number
          position?: string
          potential?: number
          price?: number
          salary?: number
          secondary_position?: string | null
          stamina?: number
          stats?: Json
        }
        Relationships: []
      }
      fm_stadiums: {
        Row: {
          capacity: number
          city: string
          country: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          capacity: number
          city: string
          country: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
        }
        Update: {
          capacity?: number
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      fm_standings: {
        Row: {
          club_id: string
          draws: number
          ga: number
          gd: number
          gf: number
          id: string
          last5: string[] | null
          league_id: string
          losses: number
          played: number
          points: number
          updated_at: string
          wins: number
        }
        Insert: {
          club_id: string
          draws?: number
          ga?: number
          gd?: number
          gf?: number
          id?: string
          last5?: string[] | null
          league_id: string
          losses?: number
          played?: number
          points?: number
          updated_at?: string
          wins?: number
        }
        Update: {
          club_id?: string
          draws?: number
          ga?: number
          gd?: number
          gf?: number
          id?: string
          last5?: string[] | null
          league_id?: string
          losses?: number
          played?: number
          points?: number
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "fm_standings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_standings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "fm_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_trainings: {
        Row: {
          club_id: string
          created_at: string
          delta_stats: Json
          energy_cost: number
          id: string
          injury_risk_delta: number
          player_id: string
          training_type: string
        }
        Insert: {
          club_id: string
          created_at?: string
          delta_stats?: Json
          energy_cost?: number
          id?: string
          injury_risk_delta?: number
          player_id: string
          training_type: string
        }
        Update: {
          club_id?: string
          created_at?: string
          delta_stats?: Json
          energy_cost?: number
          id?: string
          injury_risk_delta?: number
          player_id?: string
          training_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_trainings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_trainings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "fm_players"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_transfer_listings: {
        Row: {
          asking_price: number
          buyer_club_id: string | null
          created_at: string
          id: string
          player_id: string
          seller_club_id: string
          sold_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asking_price: number
          buyer_club_id?: string | null
          created_at?: string
          id?: string
          player_id: string
          seller_club_id: string
          sold_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asking_price?: number
          buyer_club_id?: string | null
          created_at?: string
          id?: string
          player_id?: string
          seller_club_id?: string
          sold_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fm_transfer_listings_buyer_club_id_fkey"
            columns: ["buyer_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_transfer_listings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "fm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fm_transfer_listings_seller_club_id_fkey"
            columns: ["seller_club_id"]
            isOneToOne: false
            referencedRelation: "fm_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      fm_user_preferences: {
        Row: {
          camera_preference: string | null
          created_at: string
          id: string
          performance_mode: boolean
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_preference?: string | null
          created_at?: string
          id?: string
          performance_mode?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_preference?: string | null
          created_at?: string
          id?: string
          performance_mode?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          content: string
          created_at: string
          forum_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          forum_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          forum_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums"
            referencedColumns: ["id"]
          },
        ]
      }
      forums: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_group_join_requests: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_group_message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "friend_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_group_messages: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          content: string | null
          created_at: string
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          gif_id: string | null
          group_id: string
          id: string
          image_url: string | null
          is_deleted: boolean | null
          reply_to_id: string | null
          sender_id: string
          video_url: string | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          gif_id?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          reply_to_id?: string | null
          sender_id: string
          video_url?: string | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          gif_id?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          reply_to_id?: string | null
          sender_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "friend_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_group_poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "friend_group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_group_polls: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          group_id: string
          id: string
          is_anonymous: boolean | null
          is_closed: boolean | null
          is_multiple_choice: boolean | null
          options: Json
          question: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          group_id: string
          id?: string
          is_anonymous?: boolean | null
          is_closed?: boolean | null
          is_multiple_choice?: boolean | null
          options?: Json
          question: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          is_anonymous?: boolean | null
          is_closed?: boolean | null
          is_multiple_choice?: boolean | null
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          custom_emoji: string | null
          description: string | null
          id: string
          is_private: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          name: string
          require_approval: boolean | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          custom_emoji?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name: string
          require_approval?: boolean | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          custom_emoji?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string
          require_approval?: boolean | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_chat_messages: {
        Row: {
          content: string
          created_at: string
          game_id: string
          game_type: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          game_id: string
          game_type: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          game_id?: string
          game_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_friends: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_history: {
        Row: {
          final_score: number
          game_type: string
          id: string
          is_winner: boolean
          played_at: string
          player_count: number
          position: number
          user_id: string
        }
        Insert: {
          final_score: number
          game_type?: string
          id?: string
          is_winner?: boolean
          played_at?: string
          player_count: number
          position: number
          user_id: string
        }
        Update: {
          final_score?: number
          game_type?: string
          id?: string
          is_winner?: boolean
          played_at?: string
          player_count?: number
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      game_invites: {
        Row: {
          created_at: string
          expires_at: string
          from_user_id: string
          game_type: string
          id: string
          room_id: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          from_user_id: string
          game_type: string
          id?: string
          room_id: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          from_user_id?: string
          game_type?: string
          id?: string
          room_id?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_room_players: {
        Row: {
          bid: number | null
          hand: Json | null
          id: string
          is_ready: boolean | null
          joined_at: string
          player_index: number
          room_id: string
          score: number | null
          tricks_won: number | null
          user_id: string
        }
        Insert: {
          bid?: number | null
          hand?: Json | null
          id?: string
          is_ready?: boolean | null
          joined_at?: string
          player_index: number
          room_id: string
          score?: number | null
          tricks_won?: number | null
          user_id: string
        }
        Update: {
          bid?: number | null
          hand?: Json | null
          id?: string
          is_ready?: boolean | null
          joined_at?: string
          player_index?: number
          room_id?: string
          score?: number | null
          tricks_won?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          code: string
          created_at: string
          current_round: number | null
          game_state: Json | null
          host_id: string
          id: string
          player_count: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_round?: number | null
          game_state?: Json | null
          host_id: string
          id?: string
          player_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_round?: number | null
          game_state?: Json | null
          host_id?: string
          id?: string
          player_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_settings: {
        Row: {
          created_at: string
          daily_limit: number | null
          game_type: string
          id: string
          is_enabled: boolean
          max_bet: number
          min_bet: number
          rtp_percentage: number | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          game_type: string
          id?: string
          is_enabled?: boolean
          max_bet?: number
          min_bet?: number
          rtp_percentage?: number | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          game_type?: string
          id?: string
          is_enabled?: boolean
          max_bet?: number
          min_bet?: number
          rtp_percentage?: number | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      game_stats: {
        Row: {
          created_at: string
          game_type: string
          games_played: number
          games_won: number
          highest_score: number
          id: string
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_type?: string
          games_played?: number
          games_won?: number
          highest_score?: number
          id?: string
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          games_played?: number
          games_won?: number
          highest_score?: number
          id?: string
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      games_presence: {
        Row: {
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gif_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      gif_favorites: {
        Row: {
          created_at: string
          gif_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gif_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gif_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gif_favorites_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
        ]
      }
      gif_recent: {
        Row: {
          gif_id: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          gif_id: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          gif_id?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gif_recent_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
        ]
      }
      gifs: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          file_original: string
          file_preview: string | null
          height: number | null
          id: string
          shortcode: string | null
          size: number | null
          status: string | null
          tags: string[] | null
          title: string
          usage_count: number | null
          width: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          file_original: string
          file_preview?: string | null
          height?: number | null
          id?: string
          shortcode?: string | null
          size?: number | null
          status?: string | null
          tags?: string[] | null
          title: string
          usage_count?: number | null
          width?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          file_original?: string
          file_preview?: string | null
          height?: number | null
          id?: string
          shortcode?: string | null
          size?: number | null
          status?: string | null
          tags?: string[] | null
          title?: string
          usage_count?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gifs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "gif_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts_catalog: {
        Row: {
          category: string
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          media_url: string | null
          name_en: string | null
          name_ka: string
          price_coins: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          media_url?: string | null
          name_en?: string | null
          name_ka: string
          price_coins?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          media_url?: string | null
          name_en?: string | null
          name_ka?: string
          price_coins?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gossip_leaderboard: {
        Row: {
          message_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          message_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          message_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_audit_logs: {
        Row: {
          action_type: string
          actor_user_id: string
          created_at: string
          group_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: string
          actor_user_id: string
          created_at?: string
          group_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string
          created_at?: string
          group_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "group_audit_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name_en: string | null
          name_ka: string
          name_ru: string | null
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_ka: string
          name_ru?: string | null
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_ka?: string
          name_ru?: string | null
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "group_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_daily_topics: {
        Row: {
          content: string
          created_at: string
          created_by: string
          dislikes_count: number
          id: string
          likes_count: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          dislikes_count?: number
          id?: string
          likes_count?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          dislikes_count?: number
          id?: string
          likes_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_chat_message_reads: {
        Row: {
          id: string
          message_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_messages: {
        Row: {
          content: string | null
          created_at: string
          gif_id: string | null
          id: string
          image_url: string | null
          is_anonymous: boolean
          is_deleted: boolean
          is_pinned: boolean
          is_private: boolean | null
          pinned_at: string | null
          pinned_by: string | null
          private_to_user_id: string | null
          reply_to_id: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_anonymous?: boolean
          is_deleted?: boolean
          is_pinned?: boolean
          is_private?: boolean | null
          pinned_at?: string | null
          pinned_by?: string | null
          private_to_user_id?: string | null
          reply_to_id?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_anonymous?: boolean
          is_deleted?: boolean
          is_pinned?: boolean
          is_private?: boolean | null
          pinned_at?: string | null
          pinned_by?: string | null
          private_to_user_id?: string | null
          reply_to_id?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_chat_messages_private_to_user_id_fkey"
            columns: ["private_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "group_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_presence: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_chat_topic_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_topic_comments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "group_chat_daily_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_topic_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_topic_reactions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "group_chat_daily_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chat_user_state: {
        Row: {
          cleared_at: string | null
          created_at: string
          id: string
          room_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string
          id?: string
          room_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cleared_at?: string | null
          created_at?: string
          id?: string
          room_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          created_at: string
          expires_at: string | null
          group_id: string
          id: string
          invited_by_user_id: string
          invited_user_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          group_id: string
          id?: string
          invited_by_user_id: string
          invited_user_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          invited_by_user_id?: string
          invited_user_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          created_at: string
          group_id: string
          id: string
          invited_by_user_id: string | null
          joined_at: string | null
          request_note: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          group_id: string
          id?: string
          invited_by_user_id?: string | null
          joined_at?: string | null
          request_note?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          group_id?: string
          id?: string
          invited_by_user_id?: string | null
          joined_at?: string | null
          request_note?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "group_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_media: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          id: string
          media_type: string
          meta_json: Json | null
          mime_type: string | null
          post_id: string
          sort_order: number
          thumbnail_url: string | null
          url: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          media_type?: string
          meta_json?: Json | null
          mime_type?: string | null
          post_id: string
          sort_order?: number
          thumbnail_url?: string | null
          url: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          media_type?: string
          meta_json?: Json | null
          mime_type?: string | null
          post_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_id: string
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_poll_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          poll_id: string
          sort_order: number
          votes_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          poll_id: string
          sort_order?: number
          votes_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          poll_id?: string
          sort_order?: number
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_post_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_post_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "group_post_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_post_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_post_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_polls: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_multiple_choice: boolean
          post_id: string
          question: string
          total_votes: number
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_multiple_choice?: boolean
          post_id: string
          question: string
          total_votes?: number
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_multiple_choice?: boolean
          post_id?: string
          question?: string
          total_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_post_polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string | null
          created_at: string
          edited_at: string | null
          group_id: string
          id: string
          image_url: string | null
          is_approved: boolean | null
          is_pinned: boolean | null
          link_preview_json: Json | null
          location_name: string | null
          post_type: string
          scheduled_at: string | null
          status: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_pinned?: boolean | null
          link_preview_json?: Json | null
          location_name?: string | null
          post_type?: string
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_pinned?: boolean | null
          link_preview_json?: Json | null
          location_name?: string | null
          post_type?: string
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_settings: {
        Row: {
          created_at: string
          default_tab: string | null
          enable_tabs: Json | null
          group_id: string
          group_rules: string | null
          id: string
          invite_expiration_days: number | null
          membership_questions: Json | null
          post_approval_required: boolean | null
          updated_at: string
          who_can_join: string | null
          who_can_post: string | null
          who_can_view_members: string | null
          who_can_view_posts: string | null
        }
        Insert: {
          created_at?: string
          default_tab?: string | null
          enable_tabs?: Json | null
          group_id: string
          group_rules?: string | null
          id?: string
          invite_expiration_days?: number | null
          membership_questions?: Json | null
          post_approval_required?: boolean | null
          updated_at?: string
          who_can_join?: string | null
          who_can_post?: string | null
          who_can_view_members?: string | null
          who_can_view_posts?: string | null
        }
        Update: {
          created_at?: string
          default_tab?: string | null
          enable_tabs?: Json | null
          group_id?: string
          group_rules?: string | null
          id?: string
          invite_expiration_days?: number | null
          membership_questions?: Json | null
          post_approval_required?: boolean | null
          updated_at?: string
          who_can_join?: string | null
          who_can_post?: string | null
          who_can_view_members?: string | null
          who_can_view_posts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          group_avatar_url: string | null
          group_cover_url: string | null
          group_slug: string
          id: string
          is_featured: boolean | null
          is_sponsored: boolean | null
          member_count: number | null
          name: string
          owner_user_id: string
          post_count: number | null
          privacy_type: string
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          group_avatar_url?: string | null
          group_cover_url?: string | null
          group_slug: string
          id?: string
          is_featured?: boolean | null
          is_sponsored?: boolean | null
          member_count?: number | null
          name: string
          owner_user_id: string
          post_count?: number | null
          privacy_type?: string
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          group_avatar_url?: string | null
          group_cover_url?: string | null
          group_slug?: string
          id?: string
          is_featured?: boolean | null
          is_sponsored?: boolean | null
          member_count?: number | null
          name?: string
          owner_user_id?: string
          post_count?: number | null
          privacy_type?: string
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "group_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "group_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      horoscope_daily: {
        Row: {
          career_rating: number | null
          created_at: string | null
          created_by: string | null
          date: string
          health_rating: number | null
          id: string
          love_rating: number | null
          lucky_color: string | null
          lucky_number: number | null
          prediction: string
          sign_id: string | null
        }
        Insert: {
          career_rating?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          health_rating?: number | null
          id?: string
          love_rating?: number | null
          lucky_color?: string | null
          lucky_number?: number | null
          prediction: string
          sign_id?: string | null
        }
        Update: {
          career_rating?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          health_rating?: number | null
          id?: string
          love_rating?: number | null
          lucky_color?: string | null
          lucky_number?: number | null
          prediction?: string
          sign_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horoscope_daily_sign_id_fkey"
            columns: ["sign_id"]
            isOneToOne: false
            referencedRelation: "horoscope_signs"
            referencedColumns: ["id"]
          },
        ]
      }
      horoscope_signs: {
        Row: {
          created_at: string | null
          date_end: string
          date_start: string
          element: string
          id: string
          name: string
          name_ka: string
          sort_order: number | null
          symbol: string
        }
        Insert: {
          created_at?: string | null
          date_end: string
          date_start: string
          element: string
          id?: string
          name: string
          name_ka: string
          sort_order?: number | null
          symbol: string
        }
        Update: {
          created_at?: string | null
          date_end?: string
          date_start?: string
          element?: string
          id?: string
          name?: string
          name_ka?: string
          sort_order?: number | null
          symbol?: string
        }
        Relationships: []
      }
      ip_bans: {
        Row: {
          banned_by: string
          banned_until: string | null
          created_at: string
          id: string
          ip_address: string
          is_active: boolean
          metadata: Json | null
          reason: string | null
          removed_at: string | null
          removed_by: string | null
        }
        Insert: {
          banned_by: string
          banned_until?: string | null
          created_at?: string
          id?: string
          ip_address: string
          is_active?: boolean
          metadata?: Json | null
          reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
        }
        Update: {
          banned_by?: string
          banned_until?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          is_active?: boolean
          metadata?: Json | null
          reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          cv_url: string | null
          id: string
          job_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          cv_url?: string | null
          id?: string
          job_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          cv_url?: string | null
          id?: string
          job_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_bookmarks: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bookmarks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_url: string | null
          applications_count: number | null
          category: string
          company_logo_url: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string
          experience_level: string | null
          expires_at: string | null
          id: string
          is_featured: boolean | null
          is_remote: boolean | null
          job_type: string | null
          location: string | null
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          application_url?: string | null
          applications_count?: number | null
          category: string
          company_logo_url?: string | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description: string
          experience_level?: string | null
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          location?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          application_url?: string | null
          applications_count?: number | null
          category?: string
          company_logo_url?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string
          experience_level?: string | null
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          location?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      joker_active_games: {
        Row: {
          bids: Json
          cards_per_round: number
          created_at: string
          current_player_id: string
          current_round: number
          current_set: number
          current_trick: Json
          dealer_id: string
          deck: Json
          id: string
          phase: string
          player_scores: Json
          player1_hand: Json
          player1_id: string
          player2_hand: Json
          player2_id: string
          player3_hand: Json
          player3_id: string
          player4_hand: Json
          player4_id: string
          scoreboard: Json
          status: string
          table_id: string
          trick_leader_id: string | null
          tricks_won: Json
          trump_card: Json | null
          trump_suit: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          bids?: Json
          cards_per_round?: number
          created_at?: string
          current_player_id: string
          current_round?: number
          current_set?: number
          current_trick?: Json
          dealer_id: string
          deck?: Json
          id?: string
          phase?: string
          player_scores?: Json
          player1_hand?: Json
          player1_id: string
          player2_hand?: Json
          player2_id: string
          player3_hand?: Json
          player3_id: string
          player4_hand?: Json
          player4_id: string
          scoreboard?: Json
          status?: string
          table_id: string
          trick_leader_id?: string | null
          tricks_won?: Json
          trump_card?: Json | null
          trump_suit?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          bids?: Json
          cards_per_round?: number
          created_at?: string
          current_player_id?: string
          current_round?: number
          current_set?: number
          current_trick?: Json
          dealer_id?: string
          deck?: Json
          id?: string
          phase?: string
          player_scores?: Json
          player1_hand?: Json
          player1_id?: string
          player2_hand?: Json
          player2_id?: string
          player3_hand?: Json
          player3_id?: string
          player4_hand?: Json
          player4_id?: string
          scoreboard?: Json
          status?: string
          table_id?: string
          trick_leader_id?: string | null
          tricks_won?: Json
          trump_card?: Json | null
          trump_suit?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "joker_active_games_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "joker_lobby_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      joker_game_participants: {
        Row: {
          bid: number | null
          created_at: string
          hand: Json | null
          id: string
          is_connected: boolean | null
          is_ready: boolean | null
          last_active_at: string | null
          score: number | null
          seat_index: number
          session_id: string
          tricks_won: number | null
          user_id: string
        }
        Insert: {
          bid?: number | null
          created_at?: string
          hand?: Json | null
          id?: string
          is_connected?: boolean | null
          is_ready?: boolean | null
          last_active_at?: string | null
          score?: number | null
          seat_index: number
          session_id: string
          tricks_won?: number | null
          user_id: string
        }
        Update: {
          bid?: number | null
          created_at?: string
          hand?: Json | null
          id?: string
          is_connected?: boolean | null
          is_ready?: boolean | null
          last_active_at?: string | null
          score?: number | null
          seat_index?: number
          session_id?: string
          tricks_won?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "joker_game_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "joker_game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      joker_game_sessions: {
        Row: {
          cards_per_hand: number | null
          created_at: string
          current_deal: number
          current_player_index: number
          current_set: number
          current_trick: Json | null
          deal_history: Json | null
          dealer_index: number
          deck: Json | null
          host_user_id: string
          id: string
          is_no_trump: boolean | null
          khishti_type: string
          last_trick_winner: string | null
          lead_player_index: number
          phase: string
          set_subtotals: Json | null
          status: string
          trump_card: Json | null
          trump_chooser_index: number | null
          trump_suit: string | null
          updated_at: string
          variant: string
          winner_user_id: string | null
        }
        Insert: {
          cards_per_hand?: number | null
          created_at?: string
          current_deal?: number
          current_player_index?: number
          current_set?: number
          current_trick?: Json | null
          deal_history?: Json | null
          dealer_index?: number
          deck?: Json | null
          host_user_id: string
          id?: string
          is_no_trump?: boolean | null
          khishti_type?: string
          last_trick_winner?: string | null
          lead_player_index?: number
          phase?: string
          set_subtotals?: Json | null
          status?: string
          trump_card?: Json | null
          trump_chooser_index?: number | null
          trump_suit?: string | null
          updated_at?: string
          variant?: string
          winner_user_id?: string | null
        }
        Update: {
          cards_per_hand?: number | null
          created_at?: string
          current_deal?: number
          current_player_index?: number
          current_set?: number
          current_trick?: Json | null
          deal_history?: Json | null
          dealer_index?: number
          deck?: Json | null
          host_user_id?: string
          id?: string
          is_no_trump?: boolean | null
          khishti_type?: string
          last_trick_winner?: string | null
          lead_player_index?: number
          phase?: string
          set_subtotals?: Json | null
          status?: string
          trump_card?: Json | null
          trump_chooser_index?: number | null
          trump_suit?: string | null
          updated_at?: string
          variant?: string
          winner_user_id?: string | null
        }
        Relationships: []
      }
      joker_lobby_tables: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          player1_id: string | null
          player1_username: string | null
          player2_id: string | null
          player2_username: string | null
          player3_id: string | null
          player3_username: string | null
          player4_id: string | null
          player4_username: string | null
          status: string
          table_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          player3_id?: string | null
          player3_username?: string | null
          player4_id?: string | null
          player4_username?: string | null
          status?: string
          table_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          player3_id?: string | null
          player3_username?: string | null
          player4_id?: string | null
          player4_username?: string | null
          status?: string
          table_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_cache: {
        Row: {
          id: string
          period: string
          points: number
          rank: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          period: string
          points: number
          rank: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          period?: string
          points?: number
          rank?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          is_pinned: boolean
          live_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          live_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          live_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_comments_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_invites: {
        Row: {
          created_at: string
          expires_at: string
          from_user_id: string
          id: string
          invite_type: string
          live_id: string
          responded_at: string | null
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          from_user_id: string
          id?: string
          invite_type?: string
          live_id: string
          responded_at?: string | null
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          from_user_id?: string
          id?: string
          invite_type?: string
          live_id?: string
          responded_at?: string | null
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_invites_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_invites_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_invites_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_participants: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          is_camera_off: boolean
          is_muted: boolean
          joined_at: string | null
          left_at: string | null
          live_id: string
          position: number
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          is_camera_off?: boolean
          is_muted?: boolean
          joined_at?: string | null
          left_at?: string | null
          live_id: string
          position?: number
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          is_camera_off?: boolean
          is_muted?: boolean
          joined_at?: string | null
          left_at?: string | null
          live_id?: string
          position?: number
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_participants_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_presence: {
        Row: {
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_reactions: {
        Row: {
          created_at: string
          id: string
          live_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_reactions_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          is_pinned: boolean
          is_saved: boolean | null
          like_count: number
          min_participants: number
          mux_live_id: string | null
          mux_stream_key: string | null
          playback_id: string | null
          reaction_count: number
          recording_url: string | null
          rtmp_url: string | null
          slow_mode_seconds: number | null
          started_at: string | null
          status: string
          stream_type: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          viewer_count: number
          webrtc_url: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          is_pinned?: boolean
          is_saved?: boolean | null
          like_count?: number
          min_participants?: number
          mux_live_id?: string | null
          mux_stream_key?: string | null
          playback_id?: string | null
          reaction_count?: number
          recording_url?: string | null
          rtmp_url?: string | null
          slow_mode_seconds?: number | null
          started_at?: string | null
          status?: string
          stream_type?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number
          webrtc_url?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          is_pinned?: boolean
          is_saved?: boolean | null
          like_count?: number
          min_participants?: number
          mux_live_id?: string | null
          mux_stream_key?: string | null
          playback_id?: string | null
          reaction_count?: number
          recording_url?: string | null
          rtmp_url?: string | null
          slow_mode_seconds?: number | null
          started_at?: string | null
          status?: string
          stream_type?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number
          webrtc_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_viewers: {
        Row: {
          id: string
          is_blocked: boolean
          is_muted_chat: boolean
          joined_at: string
          left_at: string | null
          live_id: string
          muted_until: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_blocked?: boolean
          is_muted_chat?: boolean
          joined_at?: string
          left_at?: string | null
          live_id: string
          muted_until?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_blocked?: boolean
          is_muted_chat?: boolean
          joined_at?: string
          left_at?: string | null
          live_id?: string
          muted_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_viewers_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_viewers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_urls: Json | null
          is_sold: boolean | null
          price: number
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_urls?: Json | null
          is_sold?: boolean | null
          price: number
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_urls?: Json | null
          is_sold?: boolean | null
          price?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          message_type: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          message_type: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          message_type?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      message_user_state: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_user_state_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "private_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_conversation_deletions: {
        Row: {
          conversation_id: string
          deleted_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          deleted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          deleted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_conversation_deletions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messenger_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_conversations: {
        Row: {
          created_at: string | null
          custom_emoji: string | null
          encryption_enabled: boolean | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          theme: Database["public"]["Enums"]["chat_theme"] | null
          updated_at: string | null
          user1_id: string
          user1_nickname: string | null
          user2_id: string
          user2_nickname: string | null
          vanish_mode_enabled: boolean | null
          vanish_mode_timeout_hours: number | null
        }
        Insert: {
          created_at?: string | null
          custom_emoji?: string | null
          encryption_enabled?: boolean | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          theme?: Database["public"]["Enums"]["chat_theme"] | null
          updated_at?: string | null
          user1_id: string
          user1_nickname?: string | null
          user2_id: string
          user2_nickname?: string | null
          vanish_mode_enabled?: boolean | null
          vanish_mode_timeout_hours?: number | null
        }
        Update: {
          created_at?: string | null
          custom_emoji?: string | null
          encryption_enabled?: boolean | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          theme?: Database["public"]["Enums"]["chat_theme"] | null
          updated_at?: string | null
          user1_id?: string
          user1_nickname?: string | null
          user2_id?: string
          user2_nickname?: string | null
          vanish_mode_enabled?: boolean | null
          vanish_mode_timeout_hours?: number | null
        }
        Relationships: []
      }
      messenger_group_members: {
        Row: {
          can_add_members: boolean | null
          can_send_media: boolean | null
          can_send_messages: boolean | null
          group_id: string
          id: string
          invited_by: string | null
          is_muted: boolean | null
          joined_at: string | null
          muted_until: string | null
          nickname: string | null
          role: Database["public"]["Enums"]["group_member_role"] | null
          user_id: string
        }
        Insert: {
          can_add_members?: boolean | null
          can_send_media?: boolean | null
          can_send_messages?: boolean | null
          group_id: string
          id?: string
          invited_by?: string | null
          is_muted?: boolean | null
          joined_at?: string | null
          muted_until?: string | null
          nickname?: string | null
          role?: Database["public"]["Enums"]["group_member_role"] | null
          user_id: string
        }
        Update: {
          can_add_members?: boolean | null
          can_send_media?: boolean | null
          can_send_messages?: boolean | null
          group_id?: string
          id?: string
          invited_by?: string | null
          is_muted?: boolean | null
          joined_at?: string | null
          muted_until?: string | null
          nickname?: string | null
          role?: Database["public"]["Enums"]["group_member_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "messenger_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_group_messages: {
        Row: {
          content: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          gif_id: string | null
          group_id: string
          id: string
          image_urls: string[] | null
          is_deleted: boolean | null
          is_edited: boolean | null
          is_vanishing: boolean | null
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
          sticker_id: string | null
          vanishes_at: string | null
          video_url: string | null
          voice_duration_seconds: number | null
          voice_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          gif_id?: string | null
          group_id: string
          id?: string
          image_urls?: string[] | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_vanishing?: boolean | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
          sticker_id?: string | null
          vanishes_at?: string | null
          video_url?: string | null
          voice_duration_seconds?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          gif_id?: string | null
          group_id?: string
          id?: string
          image_urls?: string[] | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_vanishing?: boolean | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          sticker_id?: string | null
          vanishes_at?: string | null
          video_url?: string | null
          voice_duration_seconds?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messenger_group_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "messenger_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messenger_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_group_poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_group_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "messenger_group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_group_polls: {
        Row: {
          created_at: string | null
          creator_id: string
          ends_at: string | null
          group_id: string
          id: string
          is_anonymous: boolean | null
          is_closed: boolean | null
          is_multiple_choice: boolean | null
          options: Json
          question: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          ends_at?: string | null
          group_id: string
          id?: string
          is_anonymous?: boolean | null
          is_closed?: boolean | null
          is_multiple_choice?: boolean | null
          options: Json
          question: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          ends_at?: string | null
          group_id?: string
          id?: string
          is_anonymous?: boolean | null
          is_closed?: boolean | null
          is_multiple_choice?: boolean | null
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "messenger_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_group_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_group_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messenger_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_group_reads: {
        Row: {
          group_id: string
          id: string
          last_read_at: string | null
          last_read_message_id: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_group_reads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "messenger_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_group_reads_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "messenger_group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_group_requests: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_group_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "messenger_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_group_typing: {
        Row: {
          group_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_group_typing_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "messenger_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_groups: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          created_at: string | null
          creator_id: string
          custom_emoji: string | null
          description: string | null
          encryption_enabled: boolean | null
          id: string
          is_private: boolean | null
          join_approval_required: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          last_message_sender_id: string | null
          max_members: number | null
          member_count: number | null
          name: string
          theme: Database["public"]["Enums"]["chat_theme"] | null
          updated_at: string | null
          vanish_mode_enabled: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_id: string
          custom_emoji?: string | null
          description?: string | null
          encryption_enabled?: boolean | null
          id?: string
          is_private?: boolean | null
          join_approval_required?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_sender_id?: string | null
          max_members?: number | null
          member_count?: number | null
          name: string
          theme?: Database["public"]["Enums"]["chat_theme"] | null
          updated_at?: string | null
          vanish_mode_enabled?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string
          custom_emoji?: string | null
          description?: string | null
          encryption_enabled?: boolean | null
          id?: string
          is_private?: boolean | null
          join_approval_required?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_sender_id?: string | null
          max_members?: number | null
          member_count?: number | null
          name?: string
          theme?: Database["public"]["Enums"]["chat_theme"] | null
          updated_at?: string | null
          vanish_mode_enabled?: boolean | null
        }
        Relationships: []
      }
      messenger_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          deleted_for_everyone: boolean | null
          delivered_at: string | null
          edited_at: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          gif_id: string | null
          id: string
          image_urls: string[] | null
          is_deleted: boolean | null
          is_edited: boolean | null
          is_vanishing: boolean | null
          metadata: Json | null
          original_content: string | null
          original_file_url: string | null
          original_gif_id: string | null
          original_image_urls: string[] | null
          original_video_url: string | null
          original_voice_url: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"] | null
          sticker_id: string | null
          vanishes_at: string | null
          video_url: string | null
          voice_duration_seconds: number | null
          voice_url: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deleted_for_everyone?: boolean | null
          delivered_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          gif_id?: string | null
          id?: string
          image_urls?: string[] | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_vanishing?: boolean | null
          metadata?: Json | null
          original_content?: string | null
          original_file_url?: string | null
          original_gif_id?: string | null
          original_image_urls?: string[] | null
          original_video_url?: string | null
          original_voice_url?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"] | null
          sticker_id?: string | null
          vanishes_at?: string | null
          video_url?: string | null
          voice_duration_seconds?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          deleted_for_everyone?: boolean | null
          delivered_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          gif_id?: string | null
          id?: string
          image_urls?: string[] | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_vanishing?: boolean | null
          metadata?: Json | null
          original_content?: string | null
          original_file_url?: string | null
          original_gif_id?: string | null
          original_image_urls?: string[] | null
          original_video_url?: string | null
          original_voice_url?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          sticker_id?: string | null
          vanishes_at?: string | null
          video_url?: string | null
          voice_duration_seconds?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messenger_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messenger_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messenger_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_preferences: {
        Row: {
          auto_play_gifs: boolean | null
          auto_play_videos: boolean | null
          created_at: string | null
          hd_media_wifi_only: boolean | null
          id: string
          notification_previews: boolean | null
          notification_sounds: boolean | null
          show_read_receipts: boolean | null
          show_typing_indicator: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_play_gifs?: boolean | null
          auto_play_videos?: boolean | null
          created_at?: string | null
          hd_media_wifi_only?: boolean | null
          id?: string
          notification_previews?: boolean | null
          notification_sounds?: boolean | null
          show_read_receipts?: boolean | null
          show_typing_indicator?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_play_gifs?: boolean | null
          auto_play_videos?: boolean | null
          created_at?: string | null
          hd_media_wifi_only?: boolean | null
          id?: string
          notification_previews?: boolean | null
          notification_sounds?: boolean | null
          show_read_receipts?: boolean | null
          show_typing_indicator?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messenger_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messenger_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_typing: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messenger_typing_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messenger_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_entries: {
        Row: {
          activities: string[] | null
          created_at: string
          energy_level: number | null
          id: string
          is_private: boolean | null
          location: string | null
          mood_emoji: string
          mood_label: string
          mood_level: number
          notes: string | null
          sleep_hours: number | null
          stress_level: number | null
          user_id: string
          weather: string | null
        }
        Insert: {
          activities?: string[] | null
          created_at?: string
          energy_level?: number | null
          id?: string
          is_private?: boolean | null
          location?: string | null
          mood_emoji: string
          mood_label: string
          mood_level: number
          notes?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          user_id: string
          weather?: string | null
        }
        Update: {
          activities?: string[] | null
          created_at?: string
          energy_level?: number | null
          id?: string
          is_private?: boolean | null
          location?: string | null
          mood_emoji?: string
          mood_label?: string
          mood_level?: number
          notes?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          user_id?: string
          weather?: string | null
        }
        Relationships: []
      }
      mood_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_entry_date: string | null
          longest_streak: number | null
          total_entries: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_entry_date?: string | null
          longest_streak?: number | null
          total_entries?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_entry_date?: string | null
          longest_streak?: number | null
          total_entries?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      movie_genres: {
        Row: {
          created_at: string | null
          id: string
          name_en: string | null
          name_ka: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_en?: string | null
          name_ka: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name_en?: string | null
          name_ka?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      movie_sources: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          language: string | null
          movie_id: string
          priority: number | null
          quality: Database["public"]["Enums"]["movie_quality"] | null
          source_type: Database["public"]["Enums"]["movie_source_type"]
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          language?: string | null
          movie_id: string
          priority?: number | null
          quality?: Database["public"]["Enums"]["movie_quality"] | null
          source_type?: Database["public"]["Enums"]["movie_source_type"]
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          language?: string | null
          movie_id?: string
          priority?: number | null
          quality?: Database["public"]["Enums"]["movie_quality"] | null
          source_type?: Database["public"]["Enums"]["movie_source_type"]
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_sources_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          age_rating: Database["public"]["Enums"]["age_rating"] | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description_en: string | null
          description_ka: string | null
          duration_minutes: number | null
          genres: string[] | null
          id: string
          poster_url: string | null
          status: Database["public"]["Enums"]["movie_status"] | null
          tags: string[] | null
          title_en: string | null
          title_ka: string
          trailer_url: string | null
          updated_at: string | null
          views_count: number | null
          year: number | null
        }
        Insert: {
          age_rating?: Database["public"]["Enums"]["age_rating"] | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description_en?: string | null
          description_ka?: string | null
          duration_minutes?: number | null
          genres?: string[] | null
          id?: string
          poster_url?: string | null
          status?: Database["public"]["Enums"]["movie_status"] | null
          tags?: string[] | null
          title_en?: string | null
          title_ka: string
          trailer_url?: string | null
          updated_at?: string | null
          views_count?: number | null
          year?: number | null
        }
        Update: {
          age_rating?: Database["public"]["Enums"]["age_rating"] | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description_en?: string | null
          description_ka?: string | null
          duration_minutes?: number | null
          genres?: string[] | null
          id?: string
          poster_url?: string | null
          status?: Database["public"]["Enums"]["movie_status"] | null
          tags?: string[] | null
          title_en?: string | null
          title_ka?: string
          trailer_url?: string | null
          updated_at?: string | null
          views_count?: number | null
          year?: number | null
        }
        Relationships: []
      }
      movies_genres_junction: {
        Row: {
          created_at: string | null
          genre_id: string
          id: string
          movie_id: string
        }
        Insert: {
          created_at?: string | null
          genre_id: string
          id?: string
          movie_id: string
        }
        Update: {
          created_at?: string | null
          genre_id?: string
          id?: string
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movies_genres_junction_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "movie_genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movies_genres_junction_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movies_presence: {
        Row: {
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      music: {
        Row: {
          album: string | null
          artist: string | null
          audio_url: string
          cover_url: string | null
          created_at: string
          duration: number | null
          file_size: number | null
          genre: string | null
          id: string
          lyrics: string | null
          plays: number | null
          privacy: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          album?: string | null
          artist?: string | null
          audio_url: string
          cover_url?: string | null
          created_at?: string
          duration?: number | null
          file_size?: number | null
          genre?: string | null
          id?: string
          lyrics?: string | null
          plays?: number | null
          privacy?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          album?: string | null
          artist?: string | null
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          duration?: number | null
          file_size?: number | null
          genre?: string | null
          id?: string
          lyrics?: string | null
          plays?: number | null
          privacy?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      music_likes: {
        Row: {
          created_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      music_playlist_tracks: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          track_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          track_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlists: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mux_webhooks_log: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          mux_asset_id: string | null
          mux_live_id: string | null
          payload: Json
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          mux_asset_id?: string | null
          mux_live_id?: string | null
          payload?: Json
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          mux_asset_id?: string | null
          mux_live_id?: string | null
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
      nardi_lobby_tables: {
        Row: {
          bet_amount: number | null
          created_at: string | null
          game_id: string | null
          id: string
          player1_id: string | null
          player1_username: string | null
          player2_id: string | null
          player2_username: string | null
          status: string
          table_number: number
          updated_at: string | null
        }
        Insert: {
          bet_amount?: number | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          status?: string
          table_number: number
          updated_at?: string | null
        }
        Update: {
          bet_amount?: number | null
          created_at?: string | null
          game_id?: string | null
          id?: string
          player1_id?: string | null
          player1_username?: string | null
          player2_id?: string | null
          player2_username?: string | null
          status?: string
          table_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      night_room_messages: {
        Row: {
          content: string | null
          created_at: string
          gif_id: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_private: boolean
          private_to_user_id: string | null
          reply_to_id: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_private?: boolean
          private_to_user_id?: string | null
          reply_to_id?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_private?: boolean
          private_to_user_id?: string | null
          reply_to_id?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "night_room_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "night_room_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "night_room_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      night_room_presence: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string
          from_user_id: string
          id: string
          is_read: boolean
          message: string | null
          post_id: string | null
          related_id: string | null
          related_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          is_read?: boolean
          message?: string | null
          post_id?: string | null
          related_id?: string | null
          related_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          is_read?: boolean
          message?: string | null
          post_id?: string | null
          related_id?: string | null
          related_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_followers: {
        Row: {
          followed_at: string
          id: string
          page_id: string
          user_id: string
        }
        Insert: {
          followed_at?: string
          id?: string
          page_id: string
          user_id: string
        }
        Update: {
          followed_at?: string
          id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_followers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          avatar_url: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          followers_count: number | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          followers_count?: number | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          followers_count?: number | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      pending_approvals: {
        Row: {
          content_data: Json | null
          content_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          content_data?: Json | null
          content_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          content_data?: Json | null
          content_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_views: {
        Row: {
          id: string
          photo_id: string
          photo_type: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          photo_id: string
          photo_type: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          photo_id?: string
          photo_type?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      points_history: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          delta_points: number
          id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta_points: number
          id?: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta_points?: number
          id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          source_id: string | null
          source_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          poll_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          poll_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "poll_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_comments_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_moderation: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          poll_id: string
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          poll_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          poll_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_moderation_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          poll_id: string
          position: number
          text: string
          votes_count: number | null
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          poll_id: string
          position?: number
          text: string
          votes_count?: number | null
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          poll_id?: string
          position?: number
          text?: string
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_shares: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          poll_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_shares_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_user_options: {
        Row: {
          created_at: string
          id: string
          option_index: number
          option_text: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          option_text: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          option_text?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_user_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string | null
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id?: string | null
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string | null
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_change_vote: boolean | null
          allow_comments: boolean | null
          allow_multiple_choice: boolean | null
          allow_user_options: boolean | null
          closed_at: string | null
          context_id: string | null
          context_type: string | null
          created_at: string
          expires_at: string | null
          globally_pinned_at: string | null
          globally_pinned_by: string | null
          id: string
          is_anonymous: boolean | null
          is_closed: boolean | null
          is_pinned: boolean | null
          max_selections: number | null
          options: Json
          question: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          share_count: number | null
          show_results_mode: string | null
          status: string | null
          title: string | null
          total_votes: number | null
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          allow_change_vote?: boolean | null
          allow_comments?: boolean | null
          allow_multiple_choice?: boolean | null
          allow_user_options?: boolean | null
          closed_at?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          expires_at?: string | null
          globally_pinned_at?: string | null
          globally_pinned_by?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_closed?: boolean | null
          is_pinned?: boolean | null
          max_selections?: number | null
          options?: Json
          question: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_count?: number | null
          show_results_mode?: string | null
          status?: string | null
          title?: string | null
          total_votes?: number | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          allow_change_vote?: boolean | null
          allow_comments?: boolean | null
          allow_multiple_choice?: boolean | null
          allow_user_options?: boolean | null
          closed_at?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          expires_at?: string | null
          globally_pinned_at?: string | null
          globally_pinned_by?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_closed?: boolean | null
          is_pinned?: boolean | null
          max_selections?: number | null
          options?: Json
          question?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_count?: number | null
          show_results_mode?: string | null
          status?: string | null
          title?: string | null
          total_votes?: number | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          gif_id: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          gif_id?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          gif_id?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          destination: string
          id: string
          platform: string | null
          post_id: string
          share_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          destination?: string
          id?: string
          platform?: string | null
          post_id: string
          share_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          destination?: string
          id?: string
          platform?: string | null
          post_id?: string
          share_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          globally_pinned_at: string | null
          globally_pinned_by: string | null
          hide_exact_location: boolean | null
          id: string
          image_url: string | null
          is_approved: boolean | null
          is_globally_pinned: boolean | null
          location_full: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          location_source: string | null
          metadata: Json | null
          mood_emoji: string | null
          mood_text: string | null
          mood_type: string | null
          place_id: string | null
          post_type: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          globally_pinned_at?: string | null
          globally_pinned_by?: string | null
          hide_exact_location?: boolean | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_globally_pinned?: boolean | null
          location_full?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          location_source?: string | null
          metadata?: Json | null
          mood_emoji?: string | null
          mood_text?: string | null
          mood_type?: string | null
          place_id?: string | null
          post_type?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          globally_pinned_at?: string | null
          globally_pinned_by?: string | null
          hide_exact_location?: boolean | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_globally_pinned?: boolean | null
          location_full?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          location_source?: string | null
          metadata?: Json | null
          mood_emoji?: string | null
          mood_text?: string | null
          mood_type?: string | null
          place_id?: string | null
          post_type?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      prediction_api_sync: {
        Row: {
          api_calls_used: number
          created_at: string | null
          error_message: string | null
          fixtures_synced: number
          id: string
          success: boolean | null
          sync_date: string
          sync_type: string
        }
        Insert: {
          api_calls_used?: number
          created_at?: string | null
          error_message?: string | null
          fixtures_synced?: number
          id?: string
          success?: boolean | null
          sync_date?: string
          sync_type: string
        }
        Update: {
          api_calls_used?: number
          created_at?: string | null
          error_message?: string | null
          fixtures_synced?: number
          id?: string
          success?: boolean | null
          sync_date?: string
          sync_type?: string
        }
        Relationships: []
      }
      prediction_coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_coin_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "prediction_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_coupon_items: {
        Row: {
          actual_result: string | null
          coupon_id: string
          created_at: string | null
          difficulty_score: number
          fixture_id: string
          id: string
          market_type: Database["public"]["Enums"]["market_type"]
          pick: string
          status: Database["public"]["Enums"]["coupon_item_status"]
        }
        Insert: {
          actual_result?: string | null
          coupon_id: string
          created_at?: string | null
          difficulty_score: number
          fixture_id: string
          id?: string
          market_type: Database["public"]["Enums"]["market_type"]
          pick: string
          status?: Database["public"]["Enums"]["coupon_item_status"]
        }
        Update: {
          actual_result?: string | null
          coupon_id?: string
          created_at?: string | null
          difficulty_score?: number
          fixture_id?: string
          id?: string
          market_type?: Database["public"]["Enums"]["market_type"]
          pick?: string
          status?: Database["public"]["Enums"]["coupon_item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "prediction_coupon_items_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "prediction_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_coupon_items_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "prediction_fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_coupons: {
        Row: {
          actual_return_coins: number | null
          created_at: string | null
          id: string
          potential_return_coins: number
          selections_count: number
          settled_at: string | null
          stake_coins: number
          status: Database["public"]["Enums"]["coupon_status"]
          total_difficulty: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_return_coins?: number | null
          created_at?: string | null
          id?: string
          potential_return_coins: number
          selections_count?: number
          settled_at?: string | null
          stake_coins: number
          status?: Database["public"]["Enums"]["coupon_status"]
          total_difficulty?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_return_coins?: number | null
          created_at?: string | null
          id?: string
          potential_return_coins?: number
          selections_count?: number
          settled_at?: string | null
          stake_coins?: number
          status?: Database["public"]["Enums"]["coupon_status"]
          total_difficulty?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prediction_fixtures: {
        Row: {
          api_fixture_id: number
          api_league_id: number
          away_team_logo: string | null
          away_team_name: string
          created_at: string | null
          home_team_logo: string | null
          home_team_name: string
          id: string
          last_api_sync_at: string | null
          league_logo: string | null
          league_name: string
          league_priority: number
          score_away: number | null
          score_home: number | null
          start_time: string
          status: Database["public"]["Enums"]["fixture_status"]
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          api_fixture_id: number
          api_league_id: number
          away_team_logo?: string | null
          away_team_name: string
          created_at?: string | null
          home_team_logo?: string | null
          home_team_name: string
          id?: string
          last_api_sync_at?: string | null
          league_logo?: string | null
          league_name: string
          league_priority?: number
          score_away?: number | null
          score_home?: number | null
          start_time: string
          status?: Database["public"]["Enums"]["fixture_status"]
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          api_fixture_id?: number
          api_league_id?: number
          away_team_logo?: string | null
          away_team_name?: string
          created_at?: string | null
          home_team_logo?: string | null
          home_team_name?: string
          id?: string
          last_api_sync_at?: string | null
          league_logo?: string | null
          league_name?: string
          league_priority?: number
          score_away?: number | null
          score_home?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["fixture_status"]
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_fixtures_api_league_id_fkey"
            columns: ["api_league_id"]
            isOneToOne: false
            referencedRelation: "prediction_top_leagues"
            referencedColumns: ["api_league_id"]
          },
        ]
      }
      prediction_markets: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_score: number
          id: string
          is_enabled: boolean | null
          name: string
          type: Database["public"]["Enums"]["market_type"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_score?: number
          id?: string
          is_enabled?: boolean | null
          name: string
          type: Database["public"]["Enums"]["market_type"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_score?: number
          id?: string
          is_enabled?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["market_type"]
        }
        Relationships: []
      }
      prediction_module_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      prediction_top_leagues: {
        Row: {
          api_league_id: number
          country: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          key: string
          logo_url: string | null
          name: string
          priority: number
        }
        Insert: {
          api_league_id: number
          country: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          key: string
          logo_url?: string | null
          name: string
          priority?: number
        }
        Update: {
          api_league_id?: number
          country?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          key?: string
          logo_url?: string | null
          name?: string
          priority?: number
        }
        Relationships: []
      }
      prediction_wallets: {
        Row: {
          coins_balance: number
          coupons_lost: number
          coupons_won: number
          created_at: string | null
          id: string
          total_lost: number
          total_staked: number
          total_won: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coins_balance?: number
          coupons_lost?: number
          coupons_won?: number
          created_at?: string | null
          id?: string
          total_lost?: number
          total_staked?: number
          total_won?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coins_balance?: number
          coupons_lost?: number
          coupons_won?: number
          created_at?: string | null
          id?: string
          total_lost?: number
          total_staked?: number
          total_won?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          calls_enabled: boolean | null
          created_at: string
          id: string
          is_invisible: boolean | null
          message_permission: string
          profile_visibility: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_enabled?: boolean | null
          created_at?: string
          id?: string
          is_invisible?: boolean | null
          message_permission?: string
          profile_visibility?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_enabled?: boolean | null
          created_at?: string
          id?: string
          is_invisible?: boolean | null
          message_permission?: string
          profile_visibility?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          deleted_for_receiver: boolean | null
          deleted_for_sender: boolean | null
          delivered_at: string | null
          edited_at: string | null
          gif_id: string | null
          id: string
          image_url: string | null
          is_deleted: boolean | null
          is_read: boolean
          reply_to_id: string | null
          seen_at: string | null
          sender_id: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_for_receiver?: boolean | null
          deleted_for_sender?: boolean | null
          delivered_at?: string | null
          edited_at?: string | null
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          is_read?: boolean
          reply_to_id?: string | null
          seen_at?: string | null
          sender_id: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_for_receiver?: boolean | null
          deleted_for_sender?: boolean | null
          delivered_at?: string | null
          edited_at?: string | null
          gif_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          is_read?: boolean
          reply_to_id?: string | null
          seen_at?: string | null
          sender_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_messages_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "private_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_backgrounds: {
        Row: {
          animation_preset: string | null
          background_type: string | null
          background_value: string | null
          blur_amount: number | null
          created_at: string | null
          gradient_colors: string[] | null
          id: string
          is_enabled: boolean | null
          opacity: number | null
          updated_at: string | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          animation_preset?: string | null
          background_type?: string | null
          background_value?: string | null
          blur_amount?: number | null
          created_at?: string | null
          gradient_colors?: string[] | null
          id?: string
          is_enabled?: boolean | null
          opacity?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          animation_preset?: string | null
          background_type?: string | null
          background_value?: string | null
          blur_amount?: number | null
          created_at?: string | null
          gradient_colors?: string[] | null
          id?: string
          is_enabled?: boolean | null
          opacity?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      profile_visits: {
        Row: {
          id: string
          is_seen: boolean | null
          profile_user_id: string
          visited_at: string
          visitor_user_id: string
        }
        Insert: {
          id?: string
          is_seen?: boolean | null
          profile_user_id: string
          visited_at?: string
          visitor_user_id: string
        }
        Update: {
          id?: string
          is_seen?: boolean | null
          profile_user_id?: string
          visited_at?: string
          visitor_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          age: number
          avatar_url: string | null
          birthday: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          current_latitude: number | null
          current_location: string | null
          current_longitude: number | null
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          display_name_style: Json | null
          gender: string
          id: string
          is_approved: boolean | null
          is_site_banned: boolean | null
          is_verified: boolean | null
          last_ip_address: string | null
          last_seen: string | null
          location_updated_at: string | null
          login_email: string | null
          message_style: Json | null
          online_visible_until: string | null
          password_changed_at: string | null
          reactivated_at: string | null
          reactivation_count: number | null
          show_location: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
          username: string
          verified_at: string | null
          verified_by: string | null
          verified_note: string | null
        }
        Insert: {
          account_status?: string | null
          age: number
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          current_latitude?: number | null
          current_location?: string | null
          current_longitude?: number | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          display_name_style?: Json | null
          gender: string
          id?: string
          is_approved?: boolean | null
          is_site_banned?: boolean | null
          is_verified?: boolean | null
          last_ip_address?: string | null
          last_seen?: string | null
          location_updated_at?: string | null
          login_email?: string | null
          message_style?: Json | null
          online_visible_until?: string | null
          password_changed_at?: string | null
          reactivated_at?: string | null
          reactivation_count?: number | null
          show_location?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
          username: string
          verified_at?: string | null
          verified_by?: string | null
          verified_note?: string | null
        }
        Update: {
          account_status?: string | null
          age?: number
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          current_latitude?: number | null
          current_location?: string | null
          current_longitude?: number | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          display_name_style?: Json | null
          gender?: string
          id?: string
          is_approved?: boolean | null
          is_site_banned?: boolean | null
          is_verified?: boolean | null
          last_ip_address?: string | null
          last_seen?: string | null
          location_updated_at?: string | null
          login_email?: string | null
          message_style?: Json | null
          online_visible_until?: string | null
          password_changed_at?: string | null
          reactivated_at?: string | null
          reactivation_count?: number | null
          show_location?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_note?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_correct: boolean | null
          position: number | null
          question_id: string
          text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          position?: number | null
          question_id: string
          text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          position?: number | null
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempt_answers: {
        Row: {
          answer_id: string | null
          attempt_id: string
          created_at: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          time_taken_seconds: number | null
        }
        Insert: {
          answer_id?: string | null
          attempt_id: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          time_taken_seconds?: number | null
        }
        Update: {
          answer_id?: string | null
          attempt_id?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          time_taken_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_answers_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "quiz_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: string
          is_completed: boolean | null
          percentage: number | null
          quiz_id: string
          score: number | null
          started_at: string | null
          time_taken_seconds: number | null
          total_points: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          is_completed?: boolean | null
          percentage?: number | null
          quiz_id: string
          score?: number | null
          started_at?: string | null
          time_taken_seconds?: number | null
          total_points?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          is_completed?: boolean | null
          percentage?: number | null
          quiz_id?: string
          score?: number | null
          started_at?: string | null
          time_taken_seconds?: number | null
          total_points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_comments: {
        Row: {
          content: string
          created_at: string | null
          gif_id: string | null
          id: string
          parent_id: string | null
          quiz_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          gif_id?: string | null
          id?: string
          parent_id?: string | null
          quiz_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          gif_id?: string | null
          id?: string
          parent_id?: string | null
          quiz_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_comments_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "quiz_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_comments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_moderation: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          id: string
          quiz_id: string
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          id?: string
          quiz_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          quiz_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_moderation_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: number
          explanation: string | null
          gif_url: string | null
          id: string
          image_url: string | null
          options: Json
          order_index: number | null
          points: number | null
          question: string
          quiz_id: string
          time_limit: number | null
        }
        Insert: {
          correct_answer?: number
          explanation?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number | null
          points?: number | null
          question: string
          quiz_id: string
          time_limit?: number | null
        }
        Update: {
          correct_answer?: number
          explanation?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number | null
          points?: number | null
          question?: string
          quiz_id?: string
          time_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_reactions: {
        Row: {
          created_at: string | null
          id: string
          quiz_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quiz_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quiz_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_reactions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          created_at: string
          id: string
          quiz_id: string
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_shares: {
        Row: {
          created_at: string | null
          id: string
          quiz_id: string
          share_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quiz_id: string
          share_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quiz_id?: string
          share_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_shares_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_v2_presence: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_v2_questions: {
        Row: {
          category: string | null
          correct_index: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          is_active: boolean
          language: string
          options: Json
          question_text: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          correct_index: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          language?: string
          options: Json
          question_text: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          language?: string
          options?: Json
          question_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_v2_session_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean
          points_awarded: number
          question_id: string
          selected_index: number
          session_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct: boolean
          points_awarded?: number
          question_id: string
          selected_index: number
          session_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          points_awarded?: number
          question_id?: string
          selected_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_v2_session_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_v2_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_v2_session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_v2_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_v2_sessions: {
        Row: {
          correct_count: number | null
          finished_at: string | null
          id: string
          is_completed: boolean
          language: string
          questions_order: Json
          started_at: string
          total_points: number | null
          user_id: string
        }
        Insert: {
          correct_count?: number | null
          finished_at?: string | null
          id?: string
          is_completed?: boolean
          language?: string
          questions_order?: Json
          started_at?: string
          total_points?: number | null
          user_id: string
        }
        Update: {
          correct_count?: number | null
          finished_at?: string | null
          id?: string
          is_completed?: boolean
          language?: string
          questions_order?: Json
          started_at?: string
          total_points?: number | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_v2_user_stats: {
        Row: {
          correct_answers: number
          created_at: string
          id: string
          last_played_at: string | null
          quizzes_played: number
          total_answers: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_answers?: number
          created_at?: string
          id?: string
          last_played_at?: string | null
          quizzes_played?: number
          total_answers?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_answers?: number
          created_at?: string
          id?: string
          last_played_at?: string | null
          quizzes_played?: number
          total_answers?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          allow_comments: boolean | null
          allow_retry: boolean | null
          closed_at: string | null
          context_id: string | null
          context_type: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_closed: boolean | null
          participants_count: number | null
          randomize_answers: boolean | null
          randomize_questions: boolean | null
          settings: Json | null
          show_answers_after: boolean | null
          status: string | null
          title: string
          total_points: number | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          allow_comments?: boolean | null
          allow_retry?: boolean | null
          closed_at?: string | null
          context_id?: string | null
          context_type?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_closed?: boolean | null
          participants_count?: number | null
          randomize_answers?: boolean | null
          randomize_questions?: boolean | null
          settings?: Json | null
          show_answers_after?: boolean | null
          status?: string | null
          title: string
          total_points?: number | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          allow_comments?: boolean | null
          allow_retry?: boolean | null
          closed_at?: string | null
          context_id?: string | null
          context_type?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_closed?: boolean | null
          participants_count?: number | null
          randomize_answers?: boolean | null
          randomize_questions?: boolean | null
          settings?: Json | null
          show_answers_after?: boolean | null
          status?: string | null
          title?: string
          total_points?: number | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      reel_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string
          gif_url: string | null
          id: string
          likes_count: number | null
          parent_id: string | null
          reel_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          gif_url?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          reel_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          gif_url?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          music_title: string | null
          status: string | null
          thumbnail_url: string | null
          user_id: string
          video_url: string
          views: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          music_title?: string | null
          status?: string | null
          thumbnail_url?: string | null
          user_id: string
          video_url: string
          views?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          music_title?: string | null
          status?: string | null
          thumbnail_url?: string | null
          user_id?: string
          video_url?: string
          views?: number | null
        }
        Relationships: []
      }
      referral_sources: {
        Row: {
          color: string | null
          created_at: string
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      relationship_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          proposed_status: Database["public"]["Enums"]["relationship_status_type"]
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status:
            | Database["public"]["Enums"]["relationship_request_status"]
            | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          proposed_status: Database["public"]["Enums"]["relationship_status_type"]
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?:
            | Database["public"]["Enums"]["relationship_request_status"]
            | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          proposed_status?: Database["public"]["Enums"]["relationship_status_type"]
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?:
            | Database["public"]["Enums"]["relationship_request_status"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      relationship_statuses: {
        Row: {
          created_at: string
          hide_partner_name: boolean | null
          id: string
          partner_id: string | null
          privacy_level:
            | Database["public"]["Enums"]["relationship_privacy_level"]
            | null
          relationship_started_at: string | null
          status: Database["public"]["Enums"]["relationship_status_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hide_partner_name?: boolean | null
          id?: string
          partner_id?: string | null
          privacy_level?:
            | Database["public"]["Enums"]["relationship_privacy_level"]
            | null
          relationship_started_at?: string | null
          status?:
            | Database["public"]["Enums"]["relationship_status_type"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hide_partner_name?: boolean | null
          id?: string
          partner_id?: string | null
          privacy_level?:
            | Database["public"]["Enums"]["relationship_privacy_level"]
            | null
          relationship_started_at?: string | null
          status?:
            | Database["public"]["Enums"]["relationship_status_type"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reply_likes: {
        Row: {
          created_at: string
          id: string
          reply_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "comment_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_preview: string | null
          content_type: string
          created_at: string
          id: string
          reason_text: string
          reason_type: string | null
          reported_user_id: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_preview?: string | null
          content_type: string
          created_at?: string
          id?: string
          reason_text: string
          reason_type?: string | null
          reported_user_id: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_preview?: string | null
          content_type?: string
          created_at?: string
          id?: string
          reason_text?: string
          reason_type?: string | null
          reported_user_id?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number | null
          icon: string | null
          id: string
          is_active: boolean
          item_type: string
          name: string
          price_points: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          item_type: string
          name: string
          price_points: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          name?: string
          price_points?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      site_bans: {
        Row: {
          banned_by: string
          banned_until: string | null
          block_type: string
          blocked_by_role: string | null
          blocked_ip: string | null
          blocked_nickname: string | null
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          removed_at: string | null
          removed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          banned_until?: string | null
          block_type?: string
          blocked_by_role?: string | null
          blocked_ip?: string | null
          blocked_nickname?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          banned_until?: string | null
          block_type?: string
          blocked_by_role?: string | null
          blocked_ip?: string | null
          blocked_nickname?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      storage_usage_log: {
        Row: {
          active_rooms_count: number | null
          active_sessions_count: number | null
          audio_bytes: number | null
          cache_bytes: number | null
          gifs_bytes: number | null
          id: string
          images_bytes: number | null
          logs_bytes: number | null
          recorded_at: string
          total_storage_bytes: number | null
          videos_bytes: number | null
        }
        Insert: {
          active_rooms_count?: number | null
          active_sessions_count?: number | null
          audio_bytes?: number | null
          cache_bytes?: number | null
          gifs_bytes?: number | null
          id?: string
          images_bytes?: number | null
          logs_bytes?: number | null
          recorded_at?: string
          total_storage_bytes?: number | null
          videos_bytes?: number | null
        }
        Update: {
          active_rooms_count?: number | null
          active_sessions_count?: number | null
          audio_bytes?: number | null
          cache_bytes?: number | null
          gifs_bytes?: number | null
          id?: string
          images_bytes?: number | null
          logs_bytes?: number | null
          recorded_at?: string
          total_storage_bytes?: number | null
          videos_bytes?: number | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          avg_watch_time: number | null
          background_style: string | null
          completion_rate: number | null
          content: string | null
          created_at: string
          duration_seconds: number | null
          expires_at: string
          font_style: string | null
          highlighted_at: string | null
          highlighted_by: string | null
          id: string
          image_url: string | null
          is_highlighted: boolean | null
          music_artist: string | null
          music_deezer_id: string | null
          music_start_time: number | null
          music_title: string | null
          music_url: string | null
          status: string
          story_type: string | null
          text_content: Json | null
          total_comments: number | null
          total_reactions: number | null
          total_replies: number | null
          total_views: number | null
          unique_views: number | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          avg_watch_time?: number | null
          background_style?: string | null
          completion_rate?: number | null
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          font_style?: string | null
          highlighted_at?: string | null
          highlighted_by?: string | null
          id?: string
          image_url?: string | null
          is_highlighted?: boolean | null
          music_artist?: string | null
          music_deezer_id?: string | null
          music_start_time?: number | null
          music_title?: string | null
          music_url?: string | null
          status?: string
          story_type?: string | null
          text_content?: Json | null
          total_comments?: number | null
          total_reactions?: number | null
          total_replies?: number | null
          total_views?: number | null
          unique_views?: number | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          avg_watch_time?: number | null
          background_style?: string | null
          completion_rate?: number | null
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          font_style?: string | null
          highlighted_at?: string | null
          highlighted_by?: string | null
          id?: string
          image_url?: string | null
          is_highlighted?: boolean | null
          music_artist?: string | null
          music_deezer_id?: string | null
          music_start_time?: number | null
          music_title?: string | null
          music_url?: string | null
          status?: string
          story_type?: string | null
          text_content?: Json | null
          total_comments?: number | null
          total_reactions?: number | null
          total_replies?: number | null
          total_views?: number | null
          unique_views?: number | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      story_analytics: {
        Row: {
          completed: boolean | null
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
          watch_time_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
          watch_time_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "story_analytics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean | null
          parent_id: string | null
          story_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          parent_id?: string | null
          story_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          parent_id?: string | null
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_hidden: {
        Row: {
          created_at: string
          hidden_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      story_highlights: {
        Row: {
          cover_url: string | null
          created_at: string | null
          id: string
          sort_order: number | null
          story_ids: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          story_ids?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          story_ids?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_mutes: {
        Row: {
          created_at: string
          id: string
          muted_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      story_poll_responses: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          sticker_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          sticker_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_poll_responses_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "story_stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      story_question_answers: {
        Row: {
          answer_text: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sticker_id: string
          user_id: string
        }
        Insert: {
          answer_text: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sticker_id: string
          user_id: string
        }
        Update: {
          answer_text?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_question_answers_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "story_stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          story_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_replies: {
        Row: {
          content: string | null
          created_at: string
          gif_id: string | null
          id: string
          sender_id: string
          story_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          sender_id: string
          story_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          gif_id?: string | null
          id?: string
          sender_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_replies_gif_id_fkey"
            columns: ["gif_id"]
            isOneToOne: false
            referencedRelation: "gifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_replies_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_screenshots: {
        Row: {
          created_at: string | null
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_screenshots_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_slider_responses: {
        Row: {
          created_at: string | null
          id: string
          sticker_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          sticker_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          sticker_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "story_slider_responses_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "story_stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      story_stickers: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          position_x: number | null
          position_y: number | null
          rotation: number | null
          scale: number | null
          sticker_type: string
          story_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          position_x?: number | null
          position_y?: number | null
          rotation?: number | null
          scale?: number | null
          sticker_type: string
          story_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          position_x?: number | null
          position_y?: number | null
          rotation?: number | null
          scale?: number | null
          sticker_type?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_stickers_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      sudoku_best_scores: {
        Row: {
          best_score: number
          best_time_seconds: number
          difficulty: string
          id: string
          total_wins: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_score: number
          best_time_seconds: number
          difficulty: string
          id?: string
          total_wins?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_score?: number
          best_time_seconds?: number
          difficulty?: string
          id?: string
          total_wins?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sudoku_games: {
        Row: {
          completed_at: string | null
          created_at: string
          current_state: Json
          difficulty: string
          elapsed_seconds: number | null
          errors: number | null
          hints_used: number | null
          id: string
          pencil_marks: Json | null
          puzzle: Json
          score: number | null
          solution: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_state: Json
          difficulty: string
          elapsed_seconds?: number | null
          errors?: number | null
          hints_used?: number | null
          id?: string
          pencil_marks?: Json | null
          puzzle: Json
          score?: number | null
          solution: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_state?: Json
          difficulty?: string
          elapsed_seconds?: number | null
          errors?: number | null
          hints_used?: number | null
          id?: string
          pencil_marks?: Json | null
          puzzle?: Json
          score?: number | null
          solution?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string
          delivered_at: string | null
          delivery_status: string
          error_message: string | null
          id: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          id?: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          id?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "system_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      system_broadcasts: {
        Row: {
          created_at: string
          created_by: string
          failed_count: number | null
          id: string
          link_url: string | null
          message: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          target_roles: Json | null
          target_type: string
          title: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          failed_count?: number | null
          id?: string
          link_url?: string | null
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_roles?: Json | null
          target_type?: string
          title?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          failed_count?: number | null
          id?: string
          link_url?: string | null
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_roles?: Json | null
          target_type?: string
          title?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_message_deliveries: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          message_id: string
          opened_at: string | null
          pinned: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          message_id: string
          opened_at?: string | null
          pinned?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          message_id?: string
          opened_at?: string | null
          pinned?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_message_deliveries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "system_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      system_messages: {
        Row: {
          allow_user_delete: boolean
          attachments: Json | null
          audience_type: Database["public"]["Enums"]["system_message_audience"]
          body: string
          created_at: string
          created_by: string
          id: string
          pin_until_open: boolean
          sent_at: string | null
          status: Database["public"]["Enums"]["system_message_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          allow_user_delete?: boolean
          attachments?: Json | null
          audience_type?: Database["public"]["Enums"]["system_message_audience"]
          body: string
          created_at?: string
          created_by: string
          id?: string
          pin_until_open?: boolean
          sent_at?: string | null
          status?: Database["public"]["Enums"]["system_message_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          allow_user_delete?: boolean
          attachments?: Json | null
          audience_type?: Database["public"]["Enums"]["system_message_audience"]
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          pin_until_open?: boolean
          sent_at?: string | null
          status?: Database["public"]["Enums"]["system_message_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      text_styles: {
        Row: {
          animation: string | null
          background_color: string | null
          border_color: string | null
          border_radius: number | null
          border_width: number | null
          created_at: string
          font_family: string | null
          font_size: number | null
          font_style: string | null
          font_weight: string | null
          glow_color: string | null
          glow_intensity: number | null
          gradient_end: string | null
          gradient_start: string | null
          id: string
          text_color: string | null
          text_decoration: string | null
          text_shadow: string | null
          updated_at: string
          use_gradient: boolean | null
          user_id: string
        }
        Insert: {
          animation?: string | null
          background_color?: string | null
          border_color?: string | null
          border_radius?: number | null
          border_width?: number | null
          created_at?: string
          font_family?: string | null
          font_size?: number | null
          font_style?: string | null
          font_weight?: string | null
          glow_color?: string | null
          glow_intensity?: number | null
          gradient_end?: string | null
          gradient_start?: string | null
          id?: string
          text_color?: string | null
          text_decoration?: string | null
          text_shadow?: string | null
          updated_at?: string
          use_gradient?: boolean | null
          user_id: string
        }
        Update: {
          animation?: string | null
          background_color?: string | null
          border_color?: string | null
          border_radius?: number | null
          border_width?: number | null
          created_at?: string
          font_family?: string | null
          font_size?: number | null
          font_style?: string | null
          font_weight?: string | null
          glow_color?: string | null
          glow_intensity?: number | null
          gradient_end?: string | null
          gradient_start?: string | null
          id?: string
          text_color?: string | null
          text_decoration?: string | null
          text_shadow?: string | null
          updated_at?: string
          use_gradient?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      totalizator_bet_items: {
        Row: {
          bet_id: string
          created_at: string | null
          id: string
          market_type: string
          match_id: string
          odds: number
          result: string | null
          selection: string
          status: string
        }
        Insert: {
          bet_id: string
          created_at?: string | null
          id?: string
          market_type: string
          match_id: string
          odds: number
          result?: string | null
          selection: string
          status?: string
        }
        Update: {
          bet_id?: string
          created_at?: string | null
          id?: string
          market_type?: string
          match_id?: string
          odds?: number
          result?: string | null
          selection?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "totalizator_bet_items_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "totalizator_bets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "totalizator_bet_items_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "totalizator_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      totalizator_bets: {
        Row: {
          actual_win: number | null
          created_at: string | null
          id: string
          potential_win: number
          selections_count: number
          settled_at: string | null
          stake: number
          status: string
          total_odds: number
          user_id: string
        }
        Insert: {
          actual_win?: number | null
          created_at?: string | null
          id?: string
          potential_win: number
          selections_count?: number
          settled_at?: string | null
          stake: number
          status?: string
          total_odds: number
          user_id: string
        }
        Update: {
          actual_win?: number | null
          created_at?: string | null
          id?: string
          potential_win?: number
          selections_count?: number
          settled_at?: string | null
          stake?: number
          status?: string
          total_odds?: number
          user_id?: string
        }
        Relationships: []
      }
      totalizator_leagues: {
        Row: {
          country: string
          created_at: string | null
          id: string
          is_active: boolean | null
          league_type: string
          logo_url: string | null
          name: string
          season: string
          sort_order: number | null
          teams_count: number
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          league_type: string
          logo_url?: string | null
          name: string
          season?: string
          sort_order?: number | null
          teams_count?: number
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          league_type?: string
          logo_url?: string | null
          name?: string
          season?: string
          sort_order?: number | null
          teams_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      totalizator_markets: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          market_name: string
          market_type: string
          match_id: string
          selections: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          market_name: string
          market_type: string
          match_id: string
          selections?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          market_name?: string
          market_type?: string
          match_id?: string
          selections?: Json
        }
        Relationships: [
          {
            foreignKeyName: "totalizator_markets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "totalizator_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      totalizator_matches: {
        Row: {
          away_score: number | null
          away_score_ht: number | null
          away_team_id: string
          created_at: string | null
          home_score: number | null
          home_score_ht: number | null
          home_team_id: string
          id: string
          league_id: string
          match_day: number | null
          minute: number | null
          result: string | null
          settled_at: string | null
          starts_at: string
          stats: Json | null
          status: string
        }
        Insert: {
          away_score?: number | null
          away_score_ht?: number | null
          away_team_id: string
          created_at?: string | null
          home_score?: number | null
          home_score_ht?: number | null
          home_team_id: string
          id?: string
          league_id: string
          match_day?: number | null
          minute?: number | null
          result?: string | null
          settled_at?: string | null
          starts_at: string
          stats?: Json | null
          status?: string
        }
        Update: {
          away_score?: number | null
          away_score_ht?: number | null
          away_team_id?: string
          created_at?: string | null
          home_score?: number | null
          home_score_ht?: number | null
          home_team_id?: string
          id?: string
          league_id?: string
          match_day?: number | null
          minute?: number | null
          result?: string | null
          settled_at?: string | null
          starts_at?: string
          stats?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "totalizator_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "totalizator_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "totalizator_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "totalizator_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "totalizator_matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "totalizator_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      totalizator_standings: {
        Row: {
          drawn: number
          form: string[] | null
          goal_difference: number | null
          goals_against: number
          goals_for: number
          id: string
          league_id: string
          lost: number
          played: number
          points: number
          position: number
          team_id: string
          updated_at: string | null
          won: number
        }
        Insert: {
          drawn?: number
          form?: string[] | null
          goal_difference?: number | null
          goals_against?: number
          goals_for?: number
          id?: string
          league_id: string
          lost?: number
          played?: number
          points?: number
          position?: number
          team_id: string
          updated_at?: string | null
          won?: number
        }
        Update: {
          drawn?: number
          form?: string[] | null
          goal_difference?: number | null
          goals_against?: number
          goals_for?: number
          id?: string
          league_id?: string
          lost?: number
          played?: number
          points?: number
          position?: number
          team_id?: string
          updated_at?: string | null
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "totalizator_standings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "totalizator_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "totalizator_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "totalizator_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      totalizator_teams: {
        Row: {
          country: string
          created_at: string | null
          home_advantage: number
          id: string
          is_active: boolean | null
          league_id: string
          logo_url: string | null
          name: string
          short_name: string | null
          strength_attack: number
          strength_defense: number
          strength_overall: number
        }
        Insert: {
          country: string
          created_at?: string | null
          home_advantage?: number
          id?: string
          is_active?: boolean | null
          league_id: string
          logo_url?: string | null
          name: string
          short_name?: string | null
          strength_attack?: number
          strength_defense?: number
          strength_overall?: number
        }
        Update: {
          country?: string
          created_at?: string | null
          home_advantage?: number
          id?: string
          is_active?: boolean | null
          league_id?: string
          logo_url?: string | null
          name?: string
          short_name?: string | null
          strength_attack?: number
          strength_defense?: number
          strength_overall?: number
        }
        Relationships: [
          {
            foreignKeyName: "totalizator_teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "totalizator_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      totalizator_wallets: {
        Row: {
          balance: number
          bets_lost: number
          bets_won: number
          created_at: string | null
          daily_streak: number | null
          id: string
          last_daily_bonus: string | null
          total_lost: number
          total_wagered: number
          total_won: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          bets_lost?: number
          bets_won?: number
          created_at?: string | null
          daily_streak?: number | null
          id?: string
          last_daily_bonus?: string | null
          total_lost?: number
          total_wagered?: number
          total_won?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          bets_lost?: number
          bets_won?: number
          created_at?: string | null
          daily_streak?: number | null
          id?: string
          last_daily_bonus?: string | null
          total_lost?: number
          total_wagered?: number
          total_won?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trending_music: {
        Row: {
          artist: string | null
          audio_url: string
          cover_url: string | null
          created_at: string
          id: string
          is_active: boolean | null
          plays: number | null
          title: string
        }
        Insert: {
          artist?: string | null
          audio_url: string
          cover_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          plays?: number | null
          title: string
        }
        Update: {
          artist?: string | null
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          plays?: number | null
          title?: string
        }
        Relationships: []
      }
      typing_status: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          is_displayed: boolean | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          is_displayed?: boolean | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          is_displayed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balances: {
        Row: {
          created_at: string
          id: string
          points: number
          total_lost: number
          total_wagered: number
          total_won: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          total_lost?: number
          total_wagered?: number
          total_won?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          total_lost?: number
          total_wagered?: number
          total_won?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bios: {
        Row: {
          content: string
          content_json: Json | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          content?: string
          content_json?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          content?: string
          content_json?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_blog_interests: {
        Row: {
          category_id: string | null
          id: string
          score: number | null
          tag: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          id?: string
          score?: number | null
          tag?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          id?: string
          score?: number | null
          tag?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blog_interests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chat_status: {
        Row: {
          banned_by: string | null
          banned_until: string | null
          created_at: string
          id: string
          is_banned: boolean
          is_muted: boolean
          muted_by: string | null
          muted_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          banned_until?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          is_muted?: boolean
          muted_by?: string | null
          muted_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banned_by?: string | null
          banned_until?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          is_muted?: boolean
          muted_by?: string | null
          muted_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gallery: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          privacy: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          privacy?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          privacy?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          comments_count: number
          created_at: string
          current_level: number
          experience_points: number
          friends_count: number
          games_played: number
          id: string
          last_activity_date: string | null
          likes_given: number
          likes_received: number
          posts_count: number
          quiz_wins: number
          stories_count: number
          streak_days: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          created_at?: string
          current_level?: number
          experience_points?: number
          friends_count?: number
          games_played?: number
          id?: string
          last_activity_date?: string | null
          likes_given?: number
          likes_received?: number
          posts_count?: number
          quiz_wins?: number
          stories_count?: number
          streak_days?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          created_at?: string
          current_level?: number
          experience_points?: number
          friends_count?: number
          games_played?: number
          id?: string
          last_activity_date?: string | null
          likes_given?: number
          likes_received?: number
          posts_count?: number
          quiz_wins?: number
          stories_count?: number
          streak_days?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gifts: {
        Row: {
          created_at: string
          gift_id: string
          id: string
          is_anonymous: boolean
          message: string | null
          receiver_user_id: string
          sender_user_id: string
        }
        Insert: {
          created_at?: string
          gift_id: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
          receiver_user_id: string
          sender_user_id: string
        }
        Update: {
          created_at?: string
          gift_id?: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
          receiver_user_id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memories: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_hidden: boolean | null
          memory_date: string
          memory_type: string
          reference_id: string | null
          reference_table: string | null
          user_id: string | null
          viewed_at: string | null
          years_ago: number
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean | null
          memory_date: string
          memory_type: string
          reference_id?: string | null
          reference_table?: string | null
          user_id?: string | null
          viewed_at?: string | null
          years_ago: number
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean | null
          memory_date?: string
          memory_type?: string
          reference_id?: string | null
          reference_table?: string | null
          user_id?: string | null
          viewed_at?: string | null
          years_ago?: number
        }
        Relationships: []
      }
      user_points: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          level: number | null
          total_earned: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          level?: number | null
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          level?: number | null
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      user_points_wallet: {
        Row: {
          balance_points: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_points?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_points?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          activity_key: string | null
          created_at: string
          custom_text: string | null
          display_text: string
          emoji: string
          expires_at: string | null
          feeling_key: string | null
          id: string
          is_active: boolean
          object_text: string | null
          post_id: string | null
          privacy: string
          type: string
          user_id: string
        }
        Insert: {
          activity_key?: string | null
          created_at?: string
          custom_text?: string | null
          display_text: string
          emoji: string
          expires_at?: string | null
          feeling_key?: string | null
          id?: string
          is_active?: boolean
          object_text?: string | null
          post_id?: string | null
          privacy?: string
          type: string
          user_id: string
        }
        Update: {
          activity_key?: string | null
          created_at?: string
          custom_text?: string | null
          display_text?: string
          emoji?: string
          expires_at?: string | null
          feeling_key?: string | null
          id?: string
          is_active?: boolean
          object_text?: string | null
          post_id?: string | null
          privacy?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_weather_settings: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          show_on_profile: boolean | null
          units: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          show_on_profile?: boolean | null
          units?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          show_on_profile?: boolean | null
          units?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      username_history: {
        Row: {
          changed_at: string
          id: string
          new_username: string
          old_username: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_username: string
          old_username: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_username?: string
          old_username?: string
          user_id?: string
        }
        Relationships: []
      }
      username_styles: {
        Row: {
          animation: string | null
          background_color: string | null
          border_color: string | null
          border_radius: number | null
          border_width: number | null
          created_at: string
          font_family: string | null
          font_size: number | null
          font_style: string | null
          font_weight: string | null
          glow_color: string | null
          glow_intensity: number | null
          gradient_end: string | null
          gradient_start: string | null
          id: string
          prefix_emoji: string | null
          suffix_emoji: string | null
          text_color: string | null
          text_decoration: string | null
          text_shadow: string | null
          updated_at: string
          use_gradient: boolean | null
          user_id: string
        }
        Insert: {
          animation?: string | null
          background_color?: string | null
          border_color?: string | null
          border_radius?: number | null
          border_width?: number | null
          created_at?: string
          font_family?: string | null
          font_size?: number | null
          font_style?: string | null
          font_weight?: string | null
          glow_color?: string | null
          glow_intensity?: number | null
          gradient_end?: string | null
          gradient_start?: string | null
          id?: string
          prefix_emoji?: string | null
          suffix_emoji?: string | null
          text_color?: string | null
          text_decoration?: string | null
          text_shadow?: string | null
          updated_at?: string
          use_gradient?: boolean | null
          user_id: string
        }
        Update: {
          animation?: string | null
          background_color?: string | null
          border_color?: string | null
          border_radius?: number | null
          border_width?: number | null
          created_at?: string
          font_family?: string | null
          font_size?: number | null
          font_style?: string | null
          font_weight?: string | null
          glow_color?: string | null
          glow_intensity?: number | null
          gradient_end?: string | null
          gradient_start?: string | null
          id?: string
          prefix_emoji?: string | null
          suffix_emoji?: string | null
          text_color?: string | null
          text_decoration?: string | null
          text_shadow?: string | null
          updated_at?: string
          use_gradient?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          admin_note: string | null
          attachments: Json | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          requested_note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          attachments?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requested_note?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          attachments?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requested_note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_shares: {
        Row: {
          created_at: string
          id: string
          share_type: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          share_type?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          share_type?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_shares_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_unique_views: {
        Row: {
          first_viewed_at: string
          id: string
          last_viewed_at: string
          video_id: string
          viewer_user_id: string
        }
        Insert: {
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          video_id: string
          viewer_user_id: string
        }
        Update: {
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          video_id?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_unique_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          caption: string | null
          created_at: string
          description: string | null
          duration: number | null
          file_size: number | null
          id: string
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          normalized_url: string | null
          original_url: string | null
          platform: string | null
          processing_status: string | null
          provider_video_id: string | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
          unique_views_count: number | null
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          normalized_url?: string | null
          original_url?: string | null
          platform?: string | null
          processing_status?: string | null
          provider_video_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          unique_views_count?: number | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          normalized_url?: string | null
          original_url?: string | null
          platform?: string | null
          processing_status?: string | null
          provider_video_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          unique_views_count?: number | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      vip_purchases: {
        Row: {
          expires_at: string
          id: string
          is_active: boolean
          points_spent: number
          purchased_at: string
          user_id: string
          vip_type: string
        }
        Insert: {
          expires_at: string
          id?: string
          is_active?: boolean
          points_spent: number
          purchased_at?: string
          user_id: string
          vip_type?: string
        }
        Update: {
          expires_at?: string
          id?: string
          is_active?: boolean
          points_spent?: number
          purchased_at?: string
          user_id?: string
          vip_type?: string
        }
        Relationships: []
      }
      virtual_leagues: {
        Row: {
          country: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sport: string
        }
        Insert: {
          country: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sport?: string
        }
        Update: {
          country?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sport?: string
        }
        Relationships: []
      }
      virtual_matches: {
        Row: {
          away_odds: number
          away_score: number | null
          away_team_id: string | null
          away_team_name: string
          created_at: string
          draw_odds: number
          ends_at: string
          home_odds: number
          home_score: number | null
          home_team_id: string | null
          home_team_name: string
          id: string
          league_id: string | null
          minute: number | null
          result: string | null
          starts_at: string
          status: string | null
        }
        Insert: {
          away_odds: number
          away_score?: number | null
          away_team_id?: string | null
          away_team_name: string
          created_at?: string
          draw_odds: number
          ends_at: string
          home_odds: number
          home_score?: number | null
          home_team_id?: string | null
          home_team_name: string
          id?: string
          league_id?: string | null
          minute?: number | null
          result?: string | null
          starts_at: string
          status?: string | null
        }
        Update: {
          away_odds?: number
          away_score?: number | null
          away_team_id?: string | null
          away_team_name?: string
          created_at?: string
          draw_odds?: number
          ends_at?: string
          home_odds?: number
          home_score?: number | null
          home_team_id?: string | null
          home_team_name?: string
          id?: string
          league_id?: string | null
          minute?: number | null
          result?: string | null
          starts_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "virtual_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "virtual_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "virtual_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_teams: {
        Row: {
          created_at: string
          id: string
          league_id: string | null
          logo_url: string | null
          name: string
          strength: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          league_id?: string | null
          logo_url?: string | null
          name: string
          strength?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string | null
          logo_url?: string | null
          name?: string
          strength?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "virtual_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          action: string
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          game_type: string
          id: string
          metadata: Json | null
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          game_type: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          game_type?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webrtc_signals: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          live_id: string
          processed: boolean
          signal_data: Json
          signal_type: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          live_id: string
          processed?: boolean
          signal_data: Json
          signal_type: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          live_id?: string
          processed?: boolean
          signal_data?: Json
          signal_type?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_signals_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_types: {
        Row: {
          calories_per_minute: number | null
          category: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          calories_per_minute?: number | null
          category?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          calories_per_minute?: number | null
          category?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          calories_burned: number | null
          completed_at: string
          created_at: string
          custom_name: string | null
          distance_km: number | null
          duration_minutes: number
          id: string
          mood: string | null
          notes: string | null
          user_id: string
          workout_type_id: string | null
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string
          created_at?: string
          custom_name?: string | null
          distance_km?: number | null
          duration_minutes: number
          id?: string
          mood?: string | null
          notes?: string | null
          user_id: string
          workout_type_id?: string | null
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string
          created_at?: string
          custom_name?: string | null
          distance_km?: number | null
          duration_minutes?: number
          id?: string
          mood?: string | null
          notes?: string | null
          user_id?: string
          workout_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_workout_type_id_fkey"
            columns: ["workout_type_id"]
            isOneToOne: false
            referencedRelation: "workout_types"
            referencedColumns: ["id"]
          },
        ]
      }
      www_bot_profiles: {
        Row: {
          accuracy_easy_max: number | null
          accuracy_easy_min: number | null
          accuracy_hard_max: number | null
          accuracy_hard_min: number | null
          accuracy_medium_max: number | null
          accuracy_medium_min: number | null
          avatar_key: string
          bot_id: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          profile_type: string
          response_time_max: number | null
          response_time_min: number | null
          timeout_chance: number | null
        }
        Insert: {
          accuracy_easy_max?: number | null
          accuracy_easy_min?: number | null
          accuracy_hard_max?: number | null
          accuracy_hard_min?: number | null
          accuracy_medium_max?: number | null
          accuracy_medium_min?: number | null
          avatar_key: string
          bot_id: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          profile_type: string
          response_time_max?: number | null
          response_time_min?: number | null
          timeout_chance?: number | null
        }
        Update: {
          accuracy_easy_max?: number | null
          accuracy_easy_min?: number | null
          accuracy_hard_max?: number | null
          accuracy_hard_min?: number | null
          accuracy_medium_max?: number | null
          accuracy_medium_min?: number | null
          avatar_key?: string
          bot_id?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          profile_type?: string
          response_time_max?: number | null
          response_time_min?: number | null
          timeout_chance?: number | null
        }
        Relationships: []
      }
      www_questions: {
        Row: {
          allow_partial_match: boolean | null
          category: string
          correct_answers: string[]
          created_at: string | null
          difficulty: string
          id: string
          is_active: boolean | null
          language: string
          question_text: string
          related_wrong_pool: string[] | null
          synonyms: string[] | null
          updated_at: string | null
        }
        Insert: {
          allow_partial_match?: boolean | null
          category: string
          correct_answers: string[]
          created_at?: string | null
          difficulty: string
          id?: string
          is_active?: boolean | null
          language?: string
          question_text: string
          related_wrong_pool?: string[] | null
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          allow_partial_match?: boolean | null
          category?: string
          correct_answers?: string[]
          created_at?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean | null
          language?: string
          question_text?: string
          related_wrong_pool?: string[] | null
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      www_round_answers: {
        Row: {
          answer_text: string | null
          answered_at: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          is_timeout: boolean | null
          matched_variant: string | null
          participant_id: string
          points_earned: number | null
          question_id: string
          response_time_ms: number | null
          round_number: number
          session_id: string
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_timeout?: boolean | null
          matched_variant?: string | null
          participant_id: string
          points_earned?: number | null
          question_id: string
          response_time_ms?: number | null
          round_number: number
          session_id: string
        }
        Update: {
          answer_text?: string | null
          answered_at?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_timeout?: boolean | null
          matched_variant?: string | null
          participant_id?: string
          points_earned?: number | null
          question_id?: string
          response_time_ms?: number | null
          round_number?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "www_round_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "www_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      www_user_stats: {
        Row: {
          accuracy_percentage: number | null
          avg_response_time_ms: number | null
          best_streak: number | null
          created_at: string | null
          current_streak: number | null
          games_won: number | null
          id: string
          last_played_at: string | null
          total_correct: number | null
          total_games: number | null
          total_points: number | null
          total_timeout: number | null
          total_wrong: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_percentage?: number | null
          avg_response_time_ms?: number | null
          best_streak?: number | null
          created_at?: string | null
          current_streak?: number | null
          games_won?: number | null
          id?: string
          last_played_at?: string | null
          total_correct?: number | null
          total_games?: number | null
          total_points?: number | null
          total_timeout?: number | null
          total_wrong?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_percentage?: number | null
          avg_response_time_ms?: number | null
          best_streak?: number | null
          created_at?: string | null
          current_streak?: number | null
          games_won?: number | null
          id?: string
          last_played_at?: string | null
          total_correct?: number | null
          total_games?: number | null
          total_points?: number | null
          total_timeout?: number | null
          total_wrong?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      storage_usage_stats: {
        Row: {
          bucket_id: string | null
          file_count: number | null
          upload_date: string | null
        }
        Relationships: []
      }
      www_leaderboard: {
        Row: {
          accuracy_percentage: number | null
          best_streak: number | null
          games_won: number | null
          last_played_at: string | null
          rank: number | null
          total_games: number | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_relationship_request: {
        Args: { request_id: string }
        Returns: boolean
      }
      admin_clear_room_messages: {
        Args: { room_table: string }
        Returns: number
      }
      admin_highlight_story: {
        Args: { p_highlight: boolean; p_story_id: string }
        Returns: boolean
      }
      award_activity_points: {
        Args: { p_action: string; p_points: number; p_user_id: string }
        Returns: undefined
      }
      award_points: {
        Args: {
          p_points: number
          p_reason: string
          p_ref_id?: string
          p_ref_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      bulk_cleanup_table: {
        Args: {
          p_batch_size?: number
          p_cutoff_date: string
          p_date_column: string
          p_table_name: string
        }
        Returns: Json
      }
      bulk_delete_private_messages: {
        Args: { p_batch_size?: number; p_cutoff_date: string }
        Returns: number
      }
      calculate_fm_fans: { Args: { p_club_id: string }; Returns: number }
      calculate_prediction_return:
        | {
            Args: {
              p_difficulty_scores: number[]
              p_selections_count: number
              p_stake: number
            }
            Returns: number
          }
        | {
            Args: { p_count: number; p_stake: number; p_total_diff: number }
            Returns: number
          }
      can_submit_dj_request: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_group: {
        Args: { _group_id: string; _user_id?: string }
        Returns: boolean
      }
      can_view_group_content: {
        Args: { _group_id: string; _user_id?: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { _profile_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_ip_ban: {
        Args: { check_ip: string }
        Returns: {
          ban_id: string
          banned_at: string
          banned_until: string
          is_banned: boolean
          reason: string
        }[]
      }
      check_site_ban: {
        Args: { _ip?: string; _nickname?: string; _user_id?: string }
        Returns: {
          ban_id: string
          banned_at: string
          banned_until: string
          block_type: string
          is_banned: boolean
          reason: string
        }[]
      }
      claim_daily_login_points: { Args: { p_user_id: string }; Returns: Json }
      cleanup_expired_stories: { Args: never; Returns: Json }
      cleanup_orphaned_data: { Args: { cleanup_type?: string }; Returns: Json }
      cleanup_stuck_calls: { Args: never; Returns: undefined }
      clear_conversation_messages: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      delete_all_conversations_for_user: { Args: never; Returns: number }
      delete_conversation_for_user: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      delete_expired_stories_with_notification: { Args: never; Returns: number }
      delete_old_group_messages: {
        Args: { batch_limit?: number; cutoff_date: string }
        Returns: number
      }
      delete_old_message_reads: {
        Args: { batch_limit?: number; cutoff_date: string }
        Returns: number
      }
      delete_old_notifications: {
        Args: { batch_limit?: number; cutoff_date: string }
        Returns: number
      }
      delete_old_private_messages: {
        Args: { batch_limit?: number; cutoff_date: string }
        Returns: number
      }
      delete_old_private_messages_batch: {
        Args: { batch_limit?: number; cutoff_date: string }
        Returns: number
      }
      delete_old_profile_visits: {
        Args: { batch_limit?: number; cutoff_date: string }
        Returns: number
      }
      delete_system_message_for_user: {
        Args: { p_delivery_id: string }
        Returns: boolean
      }
      dismiss_announcement: {
        Args: { p_announcement_id: string }
        Returns: boolean
      }
      end_relationship: { Args: never; Returns: boolean }
      fm_finalize_live_match: {
        Args: { p_live_match_id: string }
        Returns: boolean
      }
      fm_generate_fixtures: { Args: { p_league_id: string }; Returns: number }
      fm_play_daily_matches: { Args: never; Returns: number }
      fm_simulate_match: { Args: { p_fixture_id: string }; Returns: Json }
      fm_start_live_match: { Args: { p_fixture_id: string }; Returns: string }
      generate_email_safe_username: {
        Args: { username: string }
        Returns: string
      }
      get_active_announcements: {
        Args: never
        Returns: {
          content_html: string
          created_at: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          priority: number
          publish_end: string
          publish_start: string
          title: string
        }[]
      }
      get_analytics_summary: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
      }
      get_announcement_comments: {
        Args: { p_announcement_id: string }
        Returns: {
          announcement_id: string
          avatar_url: string
          content: string
          created_at: string
          id: string
          is_edited: boolean
          parent_id: string
          reactions_count: number
          updated_at: string
          user_id: string
          user_reaction: string
          username: string
        }[]
      }
      get_cleanup_stats: { Args: never; Returns: Json }
      get_globally_pinned_post: {
        Args: never
        Returns: {
          content: string
          created_at: string
          globally_pinned_at: string
          globally_pinned_by: string
          id: string
          image_url: string
          location_full: string
          location_lat: number
          location_lng: number
          location_name: string
          location_source: string
          user_id: string
          video_url: string
        }[]
      }
      get_group_id_from_post: { Args: { _post_id: string }; Returns: string }
      get_group_member_role: {
        Args: { _group_id: string; _user_id: string }
        Returns: string
      }
      get_group_privacy: { Args: { p_group_id: string }; Returns: string }
      get_ip_clusters: {
        Args: { min_accounts?: number }
        Returns: {
          account_count: number
          ip_address: string
          user_ids: string[]
          usernames: string[]
        }[]
      }
      get_nearby_users: {
        Args: { p_latitude: number; p_longitude: number; p_radius_km?: number }
        Returns: {
          avatar_url: string
          distance_km: number
          user_id: string
          username: string
        }[]
      }
      get_or_create_messenger_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_or_create_prediction_wallet: {
        Args: { p_user_id: string }
        Returns: {
          coins_balance: number
          coupons_lost: number
          coupons_won: number
          created_at: string | null
          id: string
          total_lost: number
          total_staked: number
          total_won: number
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "prediction_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_presence: {
        Args: { target_user_id: string; viewer_id: string }
        Returns: Json
      }
      get_registrations_by_day: {
        Args: { days_back?: number }
        Returns: {
          count: number
          date: string
        }[]
      }
      get_safe_profile: {
        Args: { target_user_id: string }
        Returns: {
          age: number
          avatar_url: string
          cover_url: string
          created_at: string
          gender: string
          id: string
          is_approved: boolean
          is_online: boolean
          last_ip_address: string
          last_seen: string
          login_email: string
          password_changed_at: string
          theme: string
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      get_top_referral_sources: {
        Args: { limit_count?: number }
        Returns: {
          conversion_rate: number
          registrations: number
          source: string
          visits: number
        }[]
      }
      get_user_site_ban: {
        Args: { _user_id: string }
        Returns: {
          ban_id: string
          banned_at: string
          banned_until: string
          block_type: string
          is_banned: boolean
          reason: string
        }[]
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      increment_movie_views: { Args: { movie_id: string }; Returns: undefined }
      increment_video_views: { Args: { vid: string }; Returns: undefined }
      instant_clear_room: { Args: { room_table: string }; Returns: number }
      is_account_active: { Args: { _user_id: string }; Returns: boolean }
      is_friend_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id?: string }
        Returns: boolean
      }
      is_group_admin_or_creator: {
        Args: { _group_id: string; _user_id?: string }
        Returns: boolean
      }
      is_group_admin_or_owner: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_owner: {
        Args: { _group_id: string; _user_id?: string }
        Returns: boolean
      }
      is_messenger_group_admin: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_messenger_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_room_dj: {
        Args: { _room_id: string; _user_id?: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      is_www_participant: {
        Args: { _session_id: string; _user_id?: string }
        Returns: boolean
      }
      is_www_session_host: {
        Args: { _session_id: string; _user_id?: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action_category: string
          p_action_type: string
          p_description?: string
          p_metadata?: Json
          p_target_content_id?: string
          p_target_content_type?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      mark_announcement_read: {
        Args: { p_announcement_id: string }
        Returns: boolean
      }
      open_system_message: { Args: { p_delivery_id: string }; Returns: boolean }
      pin_post_globally: { Args: { p_post_id: string }; Returns: boolean }
      place_prediction_coupon: {
        Args: { p_selections: Json; p_stake: number; p_user_id: string }
        Returns: Json
      }
      purchase_vip_with_points: {
        Args: { p_user_id: string; p_vip_type?: string }
        Returns: Json
      }
      reject_relationship_request: {
        Args: { request_id: string }
        Returns: boolean
      }
      send_broadcast_to_all_active_users: {
        Args: { p_broadcast_id: string; p_days_active?: number }
        Returns: number
      }
      send_gift_with_points: {
        Args: {
          p_gift_id: string
          p_is_anonymous?: boolean
          p_message?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      send_system_message: { Args: { p_message_id: string }; Returns: number }
      start_fm_live_match: { Args: { p_fixture_id: string }; Returns: string }
      unpin_post_globally: { Args: { p_post_id: string }; Returns: boolean }
      update_user_streak: { Args: { p_user_id: string }; Returns: number }
      update_wallet_balance: {
        Args: {
          p_action: string
          p_amount: number
          p_game_type: string
          p_metadata?: Json
          p_reference_id?: string
          p_user_id: string
        }
        Returns: {
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
    }
    Enums: {
      age_rating: "0+" | "6+" | "12+" | "16+" | "18+"
      announcement_audience: "all_users"
      announcement_status: "draft" | "published" | "archived"
      app_role: "super_admin" | "admin" | "moderator" | "user"
      chat_theme:
        | "default"
        | "love"
        | "tie_dye"
        | "berry"
        | "candy"
        | "citrus"
        | "tropical"
        | "forest"
        | "ocean"
        | "lavender"
        | "rose"
        | "sunset"
      cleanup_item_type: "cache" | "files" | "db" | "logs"
      cleanup_risk_level: "safe" | "medium" | "critical"
      cleanup_run_status: "idle" | "running" | "paused" | "done" | "error"
      coupon_item_status: "pending" | "won" | "lost" | "void"
      coupon_status: "pending" | "won" | "lost" | "void" | "partial"
      fixture_status:
        | "NS"
        | "LIVE"
        | "1H"
        | "HT"
        | "2H"
        | "FT"
        | "AET"
        | "PEN"
        | "PST"
        | "CANC"
        | "ABD"
        | "AWD"
        | "WO"
        | "INT"
        | "SUSP"
      group_member_role: "owner" | "admin" | "moderator" | "member"
      group_visibility: "public" | "closed" | "private"
      market_type: "winner" | "over_under_2_5" | "both_teams_score"
      message_status: "sent" | "delivered" | "read"
      movie_quality: "360p" | "480p" | "720p" | "1080p" | "4K"
      movie_source_type:
        | "iframe"
        | "mp4"
        | "hls_m3u8"
        | "youtube"
        | "vimeo"
        | "external"
      movie_status: "draft" | "published"
      relationship_privacy_level: "public" | "friends" | "only_me"
      relationship_request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "cancelled"
      relationship_status_type:
        | "single"
        | "in_relationship"
        | "engaged"
        | "married"
        | "complicated"
        | "separated"
        | "divorced"
        | "widowed"
        | "secret"
      system_message_audience:
        | "everyone"
        | "active_7d"
        | "active_3d"
        | "admins"
        | "girls"
        | "boys"
      system_message_status: "draft" | "sent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      age_rating: ["0+", "6+", "12+", "16+", "18+"],
      announcement_audience: ["all_users"],
      announcement_status: ["draft", "published", "archived"],
      app_role: ["super_admin", "admin", "moderator", "user"],
      chat_theme: [
        "default",
        "love",
        "tie_dye",
        "berry",
        "candy",
        "citrus",
        "tropical",
        "forest",
        "ocean",
        "lavender",
        "rose",
        "sunset",
      ],
      cleanup_item_type: ["cache", "files", "db", "logs"],
      cleanup_risk_level: ["safe", "medium", "critical"],
      cleanup_run_status: ["idle", "running", "paused", "done", "error"],
      coupon_item_status: ["pending", "won", "lost", "void"],
      coupon_status: ["pending", "won", "lost", "void", "partial"],
      fixture_status: [
        "NS",
        "LIVE",
        "1H",
        "HT",
        "2H",
        "FT",
        "AET",
        "PEN",
        "PST",
        "CANC",
        "ABD",
        "AWD",
        "WO",
        "INT",
        "SUSP",
      ],
      group_member_role: ["owner", "admin", "moderator", "member"],
      group_visibility: ["public", "closed", "private"],
      market_type: ["winner", "over_under_2_5", "both_teams_score"],
      message_status: ["sent", "delivered", "read"],
      movie_quality: ["360p", "480p", "720p", "1080p", "4K"],
      movie_source_type: [
        "iframe",
        "mp4",
        "hls_m3u8",
        "youtube",
        "vimeo",
        "external",
      ],
      movie_status: ["draft", "published"],
      relationship_privacy_level: ["public", "friends", "only_me"],
      relationship_request_status: [
        "pending",
        "accepted",
        "rejected",
        "cancelled",
      ],
      relationship_status_type: [
        "single",
        "in_relationship",
        "engaged",
        "married",
        "complicated",
        "separated",
        "divorced",
        "widowed",
        "secret",
      ],
      system_message_audience: [
        "everyone",
        "active_7d",
        "active_3d",
        "admins",
        "girls",
        "boys",
      ],
      system_message_status: ["draft", "sent"],
    },
  },
} as const
