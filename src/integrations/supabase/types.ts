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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_replies: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          lead_id: string | null
          organization_id: string | null
          sent_at: string
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_replies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          connected: boolean
          created_at: string
          id: string
          last_synced_at: string | null
          organization_id: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          connected?: boolean
          created_at?: string
          id?: string
          last_synced_at?: string | null
          organization_id?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          connected?: boolean
          created_at?: string
          id?: string
          last_synced_at?: string | null
          organization_id?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          lead_id: string
          message: string | null
          organization_id: string
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          message?: string | null
          organization_id: string
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          message?: string | null
          organization_id?: string
          payload?: Json
        }
        Relationships: []
      }
      leads: {
        Row: {
          ai_reply: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          lead_source: string | null
          message: string | null
          name: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          property: string | null
          property_id: string | null
          property_interest: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_reply?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          lead_source?: string | null
          message?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          property?: string | null
          property_id?: string | null
          property_interest?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_reply?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          lead_source?: string | null
          message?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          property?: string | null
          property_id?: string | null
          property_interest?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_tone: string
          billing_status: string
          business_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          current_period_end: string | null
          id: string
          name: string
          office_hours: Json
          onboarding_completed_at: string | null
          owner_id: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          past_due_since: string | null
          plan: string
          signature: string | null
          slug: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
        }
        Insert: {
          ai_tone?: string
          billing_status?: string
          business_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          name: string
          office_hours?: Json
          onboarding_completed_at?: string | null
          owner_id: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          past_due_since?: string | null
          plan?: string
          signature?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
        }
        Update: {
          ai_tone?: string
          billing_status?: string
          business_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          name?: string
          office_hours?: Json
          onboarding_completed_at?: string | null
          owner_id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          past_due_since?: string | null
          plan?: string
          signature?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          ai_replies_limit: number | null
          code: string
          created_at: string
          currency: string
          features: Json
          id: string
          interval: string
          is_active: boolean
          leads_limit: number | null
          name: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
          webhook_calls_limit: number | null
        }
        Insert: {
          ai_replies_limit?: number | null
          code: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          leads_limit?: number | null
          name: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
          webhook_calls_limit?: number | null
        }
        Update: {
          ai_replies_limit?: number | null
          code?: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          leads_limit?: number | null
          name?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
          webhook_calls_limit?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          organization_id: string
          postcode: string | null
          price: number | null
          property_type: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          viewing_slots: Json
        }
        Insert: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          postcode?: string | null
          price?: number | null
          property_type?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          viewing_slots?: Json
        }
        Update: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          postcode?: string | null
          price?: number | null
          property_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          viewing_slots?: Json
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          organization_id: string | null
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          organization_id: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan_code: string
          price_id: string | null
          product_id: string | null
          provider: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          organization_id: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_code?: string
          price_id?: string | null
          product_id?: string | null
          provider?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          organization_id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_code?: string
          price_id?: string | null
          product_id?: string | null
          provider?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      usage_counters: {
        Row: {
          ai_replies_generated: number
          created_at: string
          id: string
          leads_processed: number
          organization_id: string
          period_month: string
          updated_at: string
          webhook_calls: number
        }
        Insert: {
          ai_replies_generated?: number
          created_at?: string
          id?: string
          leads_processed?: number
          organization_id: string
          period_month: string
          updated_at?: string
          webhook_calls?: number
        }
        Update: {
          ai_replies_generated?: number
          created_at?: string
          id?: string
          leads_processed?: number
          organization_id?: string
          period_month?: string
          updated_at?: string
          webhook_calls?: number
        }
        Relationships: []
      }
      webhook_tokens: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label: string
          last_used_at: string | null
          organization_id: string
          revoked_at: string | null
          source: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label?: string
          last_used_at?: string | null
          organization_id: string
          revoked_at?: string | null
          source?: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          last_used_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          source?: string
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_org_ids: { Args: never; Returns: string[] }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { _amount?: number; _field: string; _organization_id: string }
        Returns: undefined
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      org_has_active_access: { Args: { _org_id: string }; Returns: boolean }
      org_has_billing_access: { Args: { _org_id: string }; Returns: boolean }
      org_within_usage_limit: {
        Args: { _field: string; _org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "staff"
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
      app_role: ["admin", "agent", "staff"],
    },
  },
} as const
