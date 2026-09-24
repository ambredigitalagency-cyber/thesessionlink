export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
          admin_user_id: string;
          created_at: string;
          details: Json;
          id: string;
          target_profile_id: string | null;
        };
        Insert: {
          action: string;
          admin_user_id: string;
          created_at?: string;
          details?: Json;
          id?: string;
          target_profile_id?: string | null;
        };
        Update: {
          action?: string;
          admin_user_id?: string;
          created_at?: string;
          details?: Json;
          id?: string;
          target_profile_id?: string | null;
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
      availabilities: {
        Row: {
          created_at: string;
          end_time: string;
          id: string;
          offer_id: string | null;
          profile_id: string;
          start_time: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          end_time: string;
          id?: string;
          offer_id?: string | null;
          profile_id: string;
          start_time: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          id?: string;
          offer_id?: string | null;
          profile_id?: string;
          start_time?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "availabilities_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availabilities_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availabilities_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availabilities_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          action_type: Database["public"]["Enums"]["action_type"];
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_email: string;
          client_id: string | null;
          client_message: string | null;
          client_name: string;
          client_phone: string | null;
          client_timezone: string | null;
          created_at: string;
          details: Json;
          ends_at: string | null;
          id: string;
          internal_notes: string | null;
          locale: string;
          manage_token: string;
          no_show: boolean;
          offer_id: string | null;
          offer_title: string;
          profile_id: string;
          quantity: number;
          reminder_sent_at: string | null;
          requested_date: string | null;
          starts_at: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        Insert: {
          action_type: Database["public"]["Enums"]["action_type"];
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_email: string;
          client_id?: string | null;
          client_message?: string | null;
          client_name: string;
          client_phone?: string | null;
          client_timezone?: string | null;
          created_at?: string;
          details?: Json;
          ends_at?: string | null;
          id?: string;
          internal_notes?: string | null;
          locale?: string;
          manage_token?: string;
          no_show?: boolean;
          offer_id?: string | null;
          offer_title: string;
          profile_id: string;
          quantity?: number;
          reminder_sent_at?: string | null;
          requested_date?: string | null;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Update: {
          action_type?: Database["public"]["Enums"]["action_type"];
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_email?: string;
          client_id?: string | null;
          client_message?: string | null;
          client_name?: string;
          client_phone?: string | null;
          client_timezone?: string | null;
          created_at?: string;
          details?: Json;
          ends_at?: string | null;
          id?: string;
          internal_notes?: string | null;
          locale?: string;
          manage_token?: string;
          no_show?: boolean;
          offer_id?: string | null;
          offer_title?: string;
          profile_id?: string;
          quantity?: number;
          reminder_sent_at?: string | null;
          requested_date?: string | null;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "client_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          birth_date: string | null;
          created_at: string;
          custom_fields: Json;
          email: string;
          health_notes: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          profile_id: string;
          tags: string[];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          birth_date?: string | null;
          created_at?: string;
          custom_fields?: Json;
          email: string;
          health_notes?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          profile_id: string;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          birth_date?: string | null;
          created_at?: string;
          custom_fields?: Json;
          email?: string;
          health_notes?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          profile_id?: string;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
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
          avatar_url: string | null;
          bio: string | null;
          calendar_visible: boolean;
          category_id: string | null;
          contact_channels: Json;
          contact_email: string | null;
          created_at: string;
          currency: string;
          custom_closed_message: string | null;
          display_name: string;
          headline: string | null;
          id: string;
          locale: string;
          location: string | null;
          notify_new_bookings: boolean;
          onboarding_completed_at: string | null;
          payment_method: string | null;
          phone_number: string | null;
          reminder_hours_before: number;
          slug: string;
          social_links: Json;
          subscription_active: boolean;
          suspended_at: string | null;
          suspended_by: string | null;
          suspension_reason: string | null;
          theme: Json;
          timezone: string;
          trial_ends_at: string;
          updated_at: string;
          user_id: string;
          whatsapp_number: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          calendar_visible?: boolean;
          category_id?: string | null;
          contact_channels?: Json;
          contact_email?: string | null;
          created_at?: string;
          currency?: string;
          custom_closed_message?: string | null;
          display_name: string;
          headline?: string | null;
          id?: string;
          locale?: string;
          location?: string | null;
          notify_new_bookings?: boolean;
          onboarding_completed_at?: string | null;
          payment_method?: string | null;
          phone_number?: string | null;
          reminder_hours_before?: number;
          slug: string;
          social_links?: Json;
          subscription_active?: boolean;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspension_reason?: string | null;
          theme?: Json;
          timezone?: string;
          trial_ends_at?: string;
          updated_at?: string;
          user_id: string;
          whatsapp_number?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          calendar_visible?: boolean;
          category_id?: string | null;
          contact_channels?: Json;
          contact_email?: string | null;
          created_at?: string;
          currency?: string;
          custom_closed_message?: string | null;
          display_name?: string;
          headline?: string | null;
          id?: string;
          locale?: string;
          location?: string | null;
          notify_new_bookings?: boolean;
          onboarding_completed_at?: string | null;
          payment_method?: string | null;
          phone_number?: string | null;
          reminder_hours_before?: number;
          slug?: string;
          social_links?: Json;
          subscription_active?: boolean;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspension_reason?: string | null;
          theme?: Json;
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
      time_off: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          label: string | null;
          profile_id: string;
          starts_on: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          label?: string | null;
          profile_id: string;
          starts_on: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          label?: string | null;
          profile_id?: string;
          starts_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_off_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_off_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_off_profile_id_fkey";
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
          bookings_count: number | null;
          category_id: string | null;
          category_name: Json | null;
          contact_email: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string | null;
          last_booking_at: string | null;
          locale: string | null;
          offers_count: number | null;
          onboarding_completed_at: string | null;
          slug: string | null;
          subscription_active: boolean | null;
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
      client_summaries: {
        Row: {
          bookings_count: number | null;
          created_at: string | null;
          email: string | null;
          id: string | null;
          last_booking_at: string | null;
          name: string | null;
          next_session_at: string | null;
          notes: string | null;
          pending_count: number | null;
          phone: string | null;
          profile_id: string | null;
          recent_bookings_count: number | null;
          spent: number | null;
          tags: string[] | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_coach_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      public_profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          calendar_visible: boolean | null;
          category_id: string | null;
          contact_email: string | null;
          currency: string | null;
          custom_closed_message: string | null;
          display_name: string | null;
          headline: string | null;
          id: string | null;
          locale: string | null;
          location: string | null;
          phone_number: string | null;
          slug: string | null;
          social_links: Json | null;
          theme: Json | null;
          timezone: string | null;
          whatsapp_number: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          calendar_visible?: boolean | null;
          category_id?: string | null;
          contact_email?: never;
          currency?: string | null;
          custom_closed_message?: string | null;
          display_name?: string | null;
          headline?: string | null;
          id?: string | null;
          locale?: string | null;
          location?: string | null;
          phone_number?: never;
          slug?: string | null;
          social_links?: Json | null;
          theme?: Json | null;
          timezone?: string | null;
          whatsapp_number?: never;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          calendar_visible?: boolean | null;
          category_id?: string | null;
          contact_email?: never;
          currency?: string | null;
          custom_closed_message?: string | null;
          display_name?: string | null;
          headline?: string | null;
          id?: string | null;
          locale?: string | null;
          location?: string | null;
          phone_number?: never;
          slug?: string | null;
          social_links?: Json | null;
          theme?: Json | null;
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
      check_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window: string };
        Returns: boolean;
      };
      claim_due_reminders: {
        Args: { p_limit?: number };
        Returns: {
          action_type: Database["public"]["Enums"]["action_type"];
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_email: string;
          client_id: string | null;
          client_message: string | null;
          client_name: string;
          client_phone: string | null;
          client_timezone: string | null;
          created_at: string;
          details: Json;
          ends_at: string | null;
          id: string;
          internal_notes: string | null;
          locale: string;
          manage_token: string;
          no_show: boolean;
          offer_id: string | null;
          offer_title: string;
          profile_id: string;
          quantity: number;
          reminder_sent_at: string | null;
          requested_date: string | null;
          starts_at: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      current_profile_id: { Args: never; Returns: string };
      dispatch_reminders: { Args: never; Returns: undefined };
      is_platform_admin: { Args: never; Returns: boolean };
      is_public_profile: { Args: { p_profile_id: string }; Returns: boolean };
      is_reserved_slug: { Args: { p_slug: string }; Returns: boolean };
      is_slug_available: { Args: { p_slug: string }; Returns: boolean };
      replace_weekly_availability: {
        Args: { p_offer_id: string; p_rules: Json };
        Returns: number;
      };
    };
    Enums: {
      action_type:
        | "calendar_booking"
        | "direct_reservation"
        | "contact_request"
        | "whatsapp_direct"
        | "quote_request";
      booking_status: "pending" | "confirmed" | "cancelled";
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
  public: {
    Enums: {
      action_type: [
        "calendar_booking",
        "direct_reservation",
        "contact_request",
        "whatsapp_direct",
        "quote_request",
      ],
      booking_status: ["pending", "confirmed", "cancelled"],
    },
  },
} as const;
