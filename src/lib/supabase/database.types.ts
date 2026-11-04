export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      access_emails: {
        Row: {
          created_at: string;
          kind: string;
          period_end: string;
          profile_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          kind: string;
          period_end: string;
          profile_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          kind?: string;
          period_end?: string;
          profile_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_emails_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_emails_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_emails_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_categories: {
        Row: {
          config: Json;
          created_at: string;
          description: Json;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: Json;
          position: number;
          slug: string;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          description?: Json;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: Json;
          position?: number;
          slug: string;
        };
        Update: {
          config?: Json;
          created_at?: string;
          description?: Json;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: Json;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          action: string;
          admin_user_id: string | null;
          created_at: string;
          details: Json;
          id: string;
          target_profile_id: string | null;
          via: string;
        };
        Insert: {
          action: string;
          admin_user_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_profile_id?: string | null;
          via?: string;
        };
        Update: {
          action?: string;
          admin_user_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: string;
          target_profile_id?: string | null;
          via?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_target_profile_id_fkey";
            columns: ["target_profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_target_profile_id_fkey";
            columns: ["target_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_target_profile_id_fkey";
            columns: ["target_profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_notes: {
        Row: {
          author_user_id: string | null;
          body: string;
          created_at: string;
          id: string;
          profile_id: string;
          via: string;
        };
        Insert: {
          author_user_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          profile_id: string;
          via?: string;
        };
        Update: {
          author_user_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          profile_id?: string;
          via?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_notes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_notes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_notes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coach_sign_ins: {
        Row: {
          created_at: string;
          device: string | null;
          id: number;
          ip_prefix: string | null;
          method: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device?: string | null;
          id?: never;
          ip_prefix?: string | null;
          method: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device?: string | null;
          id?: never;
          ip_prefix?: string | null;
          method?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          action_config: Json;
          action_type: Database["public"]["Enums"]["action_type"];
          created_at: string;
          custom_fields: Json;
          description: string | null;
          id: string;
          is_active: boolean;
          main_photo_url: string | null;
          photos: Json;
          position: number;
          price: number | null;
          price_type: string;
          profile_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          action_config?: Json;
          action_type: Database["public"]["Enums"]["action_type"];
          created_at?: string;
          custom_fields?: Json;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          main_photo_url?: string | null;
          photos?: Json;
          position?: number;
          price?: number | null;
          price_type?: string;
          profile_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          action_config?: Json;
          action_type?: Database["public"]["Enums"]["action_type"];
          created_at?: string;
          custom_fields?: Json;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          main_photo_url?: string | null;
          photos?: Json;
          position?: number;
          price?: number | null;
          price_type?: string;
          profile_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_progress: {
        Row: {
          category_id: string | null;
          step: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_id?: string | null;
          step: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_id?: string | null;
          step?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "activity_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      paddle_webhook_events: {
        Row: {
          event_id: string;
          event_type: string;
          occurred_at: string;
          outcome: string;
          profile_id: string | null;
          received_at: string;
        };
        Insert: {
          event_id: string;
          event_type: string;
          occurred_at: string;
          outcome: string;
          profile_id?: string | null;
          received_at?: string;
        };
        Update: {
          event_id?: string;
          event_type?: string;
          occurred_at?: string;
          outcome?: string;
          profile_id?: string | null;
          received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "paddle_webhook_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paddle_webhook_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paddle_webhook_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      page_blocks: {
        Row: {
          config: Json;
          created_at: string;
          id: string;
          offer_id: string | null;
          pending: boolean;
          position: number;
          profile_id: string;
          suggested: boolean;
          type: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          id?: string;
          offer_id?: string | null;
          pending?: boolean;
          position?: number;
          profile_id: string;
          suggested?: boolean;
          type: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          config?: Json;
          created_at?: string;
          id?: string;
          offer_id?: string | null;
          pending?: boolean;
          position?: number;
          profile_id?: string;
          suggested?: boolean;
          type?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "page_blocks_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_blocks_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_blocks_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_blocks_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      page_events: {
        Row: {
          block_id: string | null;
          city: string | null;
          contact_kind: string | null;
          country: string | null;
          created_at: string;
          device: string | null;
          id: number;
          profile_id: string;
          source: string;
          type: string;
          visitor_hash: string;
        };
        Insert: {
          block_id?: string | null;
          city?: string | null;
          contact_kind?: string | null;
          country?: string | null;
          created_at?: string;
          device?: string | null;
          id?: never;
          profile_id: string;
          source?: string;
          type: string;
          visitor_hash: string;
        };
        Update: {
          block_id?: string | null;
          city?: string | null;
          contact_kind?: string | null;
          country?: string | null;
          created_at?: string;
          device?: string | null;
          id?: never;
          profile_id?: string;
          source?: string;
          type?: string;
          visitor_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "page_events_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "page_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          accent_color: string;
          avatar_url: string | null;
          bio: string | null;
          category_id: string | null;
          contact_channels: Json;
          contact_email: string | null;
          created_at: string;
          currency: string;
          custom_fields: Json;
          deleted_at: string | null;
          deletion_warned_at: string | null;
          display_name: string;
          headline: string | null;
          id: string;
          locale: string;
          location: string | null;
          onboarding_completed_at: string | null;
          paddle_customer_id: string | null;
          paddle_subscription_id: string | null;
          page_initialized_at: string | null;
          phone_number: string | null;
          slug: string;
          social_links: Json;
          subscription_active: boolean;
          subscription_ended_at: string | null;
          subscription_renews_at: string | null;
          subscription_status: string | null;
          subscription_synced_at: string | null;
          suspended_at: string | null;
          suspended_by: string | null;
          suspension_reason: string | null;
          theme: string;
          timezone: string;
          trial_ends_at: string;
          updated_at: string;
          user_id: string;
          whatsapp_number: string | null;
        };
        Insert: {
          accent_color?: string;
          avatar_url?: string | null;
          bio?: string | null;
          category_id?: string | null;
          contact_channels?: Json;
          contact_email?: string | null;
          created_at?: string;
          currency?: string;
          custom_fields?: Json;
          deleted_at?: string | null;
          deletion_warned_at?: string | null;
          display_name: string;
          headline?: string | null;
          id?: string;
          locale?: string;
          location?: string | null;
          onboarding_completed_at?: string | null;
          paddle_customer_id?: string | null;
          paddle_subscription_id?: string | null;
          page_initialized_at?: string | null;
          phone_number?: string | null;
          slug: string;
          social_links?: Json;
          subscription_active?: boolean;
          subscription_ended_at?: string | null;
          subscription_renews_at?: string | null;
          subscription_status?: string | null;
          subscription_synced_at?: string | null;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspension_reason?: string | null;
          theme?: string;
          timezone?: string;
          trial_ends_at?: string;
          updated_at?: string;
          user_id: string;
          whatsapp_number?: string | null;
        };
        Update: {
          accent_color?: string;
          avatar_url?: string | null;
          bio?: string | null;
          category_id?: string | null;
          contact_channels?: Json;
          contact_email?: string | null;
          created_at?: string;
          currency?: string;
          custom_fields?: Json;
          deleted_at?: string | null;
          deletion_warned_at?: string | null;
          display_name?: string;
          headline?: string | null;
          id?: string;
          locale?: string;
          location?: string | null;
          onboarding_completed_at?: string | null;
          paddle_customer_id?: string | null;
          paddle_subscription_id?: string | null;
          page_initialized_at?: string | null;
          phone_number?: string | null;
          slug?: string;
          social_links?: Json;
          subscription_active?: boolean;
          subscription_ended_at?: string | null;
          subscription_renews_at?: string | null;
          subscription_status?: string | null;
          subscription_synced_at?: string | null;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspension_reason?: string | null;
          theme?: string;
          timezone?: string;
          trial_ends_at?: string;
          updated_at?: string;
          user_id?: string;
          whatsapp_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "activity_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limit_events: {
        Row: {
          bucket: string;
          created_at: string;
          id: number;
        };
        Insert: {
          bucket: string;
          created_at?: string;
          id?: never;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          id?: never;
        };
        Relationships: [];
      };
      tracking_sources: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          label: string;
          profile_id: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          label: string;
          profile_id: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          label?: string;
          profile_id?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracking_sources_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_sources_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_sources_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      admin_coach_overview: {
        Row: {
          category_id: string | null;
          category_name: Json | null;
          contact_email: string | null;
          created_at: string | null;
          deleted_at: string | null;
          display_name: string | null;
          id: string | null;
          locale: string | null;
          offers_count: number | null;
          onboarding_completed_at: string | null;
          slug: string | null;
          subscription_active: boolean | null;
          subscription_ended_at: string | null;
          subscription_status: string | null;
          suspended_at: string | null;
          suspension_reason: string | null;
          trial_ends_at: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "activity_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      public_profiles: {
        Row: {
          accent_color: string | null;
          avatar_url: string | null;
          bio: string | null;
          category_id: string | null;
          currency: string | null;
          custom_fields: Json | null;
          display_name: string | null;
          headline: string | null;
          id: string | null;
          locale: string | null;
          location: string | null;
          published: boolean | null;
          slug: string | null;
          theme: string | null;
          timezone: string | null;
          whatsapp_number: string | null;
        };
        Insert: {
          accent_color?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          category_id?: string | null;
          currency?: string | null;
          custom_fields?: Json | null;
          display_name?: string | null;
          headline?: string | null;
          id?: string | null;
          locale?: string | null;
          location?: string | null;
          published?: never;
          slug?: string | null;
          theme?: string | null;
          timezone?: string | null;
          whatsapp_number?: never;
        };
        Update: {
          accent_color?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          category_id?: string | null;
          currency?: string | null;
          custom_fields?: Json | null;
          display_name?: string | null;
          headline?: string | null;
          id?: string | null;
          locale?: string | null;
          location?: string | null;
          published?: never;
          slug?: string | null;
          theme?: string | null;
          timezone?: string | null;
          whatsapp_number?: never;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "activity_categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      access_email_due: {
        Args: {
          p_now: string;
          p_subscription_active: boolean;
          p_subscription_ended_at: string;
          p_trial_ends_at: string;
        };
        Returns: string;
      };
      access_ends_at: {
        Args: { p_subscription_ended_at: string; p_trial_ends_at: string };
        Returns: string;
      };
      access_state: { Args: { p_profile_id: string }; Returns: string };
      access_state_at: {
        Args: {
          p_now: string;
          p_subscription_active: boolean;
          p_subscription_ended_at: string;
          p_trial_ends_at: string;
        };
        Returns: string;
      };
      admin_active_sessions: {
        Args: { p_user_id: string };
        Returns: {
          created_at: string;
          refreshed_at: string;
        }[];
      };
      admin_unfinished_signups: {
        Args: never;
        Returns: {
          created_at: string;
          email: string;
          email_confirmed: boolean;
          last_sign_in_at: string;
          provider: string;
          slug: string;
          step: string;
          user_id: string;
        }[];
      };
      available_slugs: { Args: { p_slugs: string[] }; Returns: string[] };
      build_default_page: { Args: { p_profile_id: string }; Returns: number };
      can_edit_own_page: { Args: never; Returns: boolean };
      check_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window: string };
        Returns: boolean;
      };
      claim_access_emails: {
        Args: { p_limit?: number; p_now?: string };
        Returns: {
          contact_email: string;
          display_name: string;
          kind: string;
          locale: string;
          period_end: string;
          profile_id: string;
          slug: string;
          user_id: string;
        }[];
      };
      claim_due_deletion_warnings: {
        Args: { p_grace_days?: number; p_limit?: number; p_warn_days?: number };
        Returns: {
          accent_color: string;
          avatar_url: string | null;
          bio: string | null;
          category_id: string | null;
          contact_channels: Json;
          contact_email: string | null;
          created_at: string;
          currency: string;
          custom_fields: Json;
          deleted_at: string | null;
          deletion_warned_at: string | null;
          display_name: string;
          headline: string | null;
          id: string;
          locale: string;
          location: string | null;
          onboarding_completed_at: string | null;
          paddle_customer_id: string | null;
          paddle_subscription_id: string | null;
          page_initialized_at: string | null;
          phone_number: string | null;
          slug: string;
          social_links: Json;
          subscription_active: boolean;
          subscription_ended_at: string | null;
          subscription_renews_at: string | null;
          subscription_status: string | null;
          subscription_synced_at: string | null;
          suspended_at: string | null;
          suspended_by: string | null;
          suspension_reason: string | null;
          theme: string;
          timezone: string;
          trial_ends_at: string;
          updated_at: string;
          user_id: string;
          whatsapp_number: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      current_profile_id: { Args: never; Returns: string };
      dispatch_access_emails: { Args: never; Returns: undefined };
      dispatch_account_purge: { Args: never; Returns: undefined };
      dispatch_deletion_warnings: { Args: never; Returns: undefined };
      exposes_whatsapp: { Args: { p_profile_id: string }; Returns: boolean };
      is_live_profile: { Args: { p_profile_id: string }; Returns: boolean };
      is_platform_admin: { Args: never; Returns: boolean };
      is_public_profile: { Args: { p_profile_id: string }; Returns: boolean };
      is_reserved_slug: { Args: { p_slug: string }; Returns: boolean };
      is_slug_available: { Args: { p_slug: string }; Returns: boolean };
      onboarding_advance: {
        Args: { p_category_id?: string; p_step: string };
        Returns: string;
      };
      onboarding_publish: {
        Args: {
          p_block: Json;
          p_kind: string;
          p_offer_title: string;
          p_pending: Json;
        };
        Returns: boolean;
      };
      onboarding_step_rank: { Args: { p_step: string }; Returns: number };
      page_stats: {
        Args: { p_days: number; p_profile_id: string };
        Returns: Json;
      };
      profile_unavailable: { Args: { p_slug: string }; Returns: boolean };
      purge_deleted_accounts: {
        Args: { p_grace_days?: number };
        Returns: number;
      };
      purge_page_events: { Args: { p_months?: number }; Returns: number };
      record_page_event: {
        Args: {
          p_block_id: string;
          p_city: string;
          p_contact_kind: string;
          p_country: string;
          p_device: string;
          p_profile_id: string;
          p_source: string;
          p_type: string;
          p_visitor_hash: string;
        };
        Returns: boolean;
      };
      social_url: { Args: { p_key: string; p_value: string }; Returns: string };
      trial_summary: { Args: { p_profile_id: string }; Returns: Json };
    };
    Enums: {
      action_type: "contact_request" | "whatsapp_direct" | "quote_request";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      action_type: ["contact_request", "whatsapp_direct", "quote_request"],
    },
  },
} as const;
