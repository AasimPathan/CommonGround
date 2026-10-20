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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      business_campaigns: {
        Row: {
          budget: string
          business_id: string
          business_label: string | null
          content_type: string
          created_at: string
          follower_range: string
          id: string
          language: string
          location: string
          maximum_budget: number | null
          niche: string
          platform: string
          title: string | null
          updated_at: string
        }
        Insert: {
          budget: string
          business_id: string
          business_label?: string | null
          content_type: string
          created_at?: string
          follower_range: string
          id?: string
          language: string
          location: string
          maximum_budget?: number | null
          niche: string
          platform: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          budget?: string
          business_id?: string
          business_label?: string | null
          content_type?: string
          created_at?: string
          follower_range?: string
          id?: string
          language?: string
          location?: string
          maximum_budget?: number | null
          niche?: string
          platform?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_shortlists: {
        Row: {
          business_id: string
          created_at: string
          creator_id: string
          id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          creator_id: string
          id?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          creator_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_shortlists_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_marketplace_profiles"
            referencedColumns: ["creator_id"]
          },
        ]
      }
      campaign_bids: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          creator_id: string
          id: string
          status: Database["public"]["Enums"]["bid_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          creator_id: string
          id?: string
          status?: Database["public"]["Enums"]["bid_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          status?: Database["public"]["Enums"]["bid_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_bids_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "business_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_bids_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_marketplace_profiles"
            referencedColumns: ["creator_id"]
          },
        ]
      }
      claims: {
        Row: {
          attributed_to: string
          created_at: string
          id: string
          initiative_id: string
          link_reference: string | null
          position: number
          source_date: string | null
          source_name: string
          statement: string
        }
        Insert: {
          attributed_to: string
          created_at?: string
          id?: string
          initiative_id: string
          link_reference?: string | null
          position?: number
          source_date?: string | null
          source_name: string
          statement: string
        }
        Update: {
          attributed_to?: string
          created_at?: string
          id?: string
          initiative_id?: string
          link_reference?: string | null
          position?: number
          source_date?: string | null
          source_name?: string
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string
          campaign_id: string
          connection_id: string
          created_at: string
          creator_id: string
          id: string
        }
        Insert: {
          business_id: string
          campaign_id: string
          connection_id: string
          created_at?: string
          creator_id: string
          id?: string
        }
        Update: {
          business_id?: string
          campaign_id?: string
          connection_id?: string
          created_at?: string
          creator_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "business_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "marketplace_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_marketplace_evidence: {
        Row: {
          created_at: string
          creator_id: string
          evidence_date: string | null
          evidence_link: string | null
          evidence_text: string
          id: string
          position: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          evidence_date?: string | null
          evidence_link?: string | null
          evidence_text: string
          id?: string
          position?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          evidence_date?: string | null
          evidence_link?: string | null
          evidence_text?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_marketplace_evidence_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_marketplace_profiles"
            referencedColumns: ["creator_id"]
          },
        ]
      }
      creator_marketplace_profiles: {
        Row: {
          avatar_url: string | null
          content_types: string[]
          created_at: string
          creator_id: string
          display_name: string
          follower_count: number | null
          follower_range: string | null
          instagram_username: string | null
          languages: string[]
          location: string | null
          niche: string | null
          profile_link: string | null
          status: Database["public"]["Enums"]["creator_profile_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          content_types?: string[]
          created_at?: string
          creator_id: string
          display_name?: string
          follower_count?: number | null
          follower_range?: string | null
          instagram_username?: string | null
          languages?: string[]
          location?: string | null
          niche?: string | null
          profile_link?: string | null
          status?: Database["public"]["Enums"]["creator_profile_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          content_types?: string[]
          created_at?: string
          creator_id?: string
          display_name?: string
          follower_count?: number | null
          follower_range?: string | null
          instagram_username?: string | null
          languages?: string[]
          location?: string | null
          niche?: string | null
          profile_link?: string | null
          status?: Database["public"]["Enums"]["creator_profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      creator_reels: {
        Row: {
          comments: number
          created_at: string
          creator_id: string
          id: string
          likes: number
          posted_date: string | null
          url: string
          views: number
        }
        Insert: {
          comments?: number
          created_at?: string
          creator_id: string
          id?: string
          likes?: number
          posted_date?: string | null
          url: string
          views: number
        }
        Update: {
          comments?: number
          created_at?: string
          creator_id?: string
          id?: string
          likes?: number
          posted_date?: string | null
          url?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_reels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_marketplace_profiles"
            referencedColumns: ["creator_id"]
          },
        ]
      }
      creator_social_accounts: {
        Row: {
          check_status: string
          checked_at: string
          creator_id: string
          evidence_path: string | null
          id: string
          metrics: Json
          platform: string
          profile_url: string | null
          source_type: string
          username: string
        }
        Insert: {
          check_status: string
          checked_at?: string
          creator_id: string
          evidence_path?: string | null
          id?: string
          metrics?: Json
          platform: string
          profile_url?: string | null
          source_type: string
          username: string
        }
        Update: {
          check_status?: string
          checked_at?: string
          creator_id?: string
          evidence_path?: string | null
          id?: string
          metrics?: Json
          platform?: string
          profile_url?: string | null
          source_type?: string
          username?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          created_at: string
          description: string
          id: string
          initiative_id: string
          link: string | null
          position: number
          reference: string | null
          source_date: string | null
          source_name: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          initiative_id: string
          link?: string | null
          position?: number
          reference?: string | null
          source_date?: string | null
          source_name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          initiative_id?: string
          link?: string | null
          position?: number
          reference?: string | null
          source_date?: string | null
          source_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          category: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          location: string
          published_at: string | null
          status: Database["public"]["Enums"]["initiative_status"]
          suggested_action: string | null
          title: string
          updated_at: string
          why_it_matters: string | null
        }
        Insert: {
          category: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          location: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          suggested_action?: string | null
          title: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Update: {
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          location?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["initiative_status"]
          suggested_action?: string | null
          title?: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Relationships: []
      }
      marketplace_connections: {
        Row: {
          business_id: string
          campaign_id: string
          confirmed_at: string | null
          created_at: string
          creator_id: string
          id: string
          responded_at: string | null
          selected_bid_id: string | null
          status: Database["public"]["Enums"]["connection_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          campaign_id: string
          confirmed_at?: string | null
          created_at?: string
          creator_id: string
          id?: string
          responded_at?: string | null
          selected_bid_id?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          campaign_id?: string
          confirmed_at?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          responded_at?: string | null
          selected_bid_id?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_connections_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "business_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_connections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_marketplace_profiles"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "marketplace_connections_selected_bid_id_fkey"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "campaign_bids"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          connection_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "marketplace_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      participations: {
        Row: {
          completed_at: string | null
          content_reviewed_at: string | null
          content_status: string | null
          content_url: string | null
          creator_id: string
          id: string
          initiative_id: string
          status: Database["public"]["Enums"]["participation_status"]
          supported_at: string
        }
        Insert: {
          completed_at?: string | null
          content_reviewed_at?: string | null
          content_status?: string | null
          content_url?: string | null
          creator_id: string
          id?: string
          initiative_id: string
          status?: Database["public"]["Enums"]["participation_status"]
          supported_at?: string
        }
        Update: {
          completed_at?: string | null
          content_reviewed_at?: string | null
          content_status?: string | null
          content_url?: string | null
          creator_id?: string
          id?: string
          initiative_id?: string
          status?: Database["public"]["Enums"]["participation_status"]
          supported_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participations_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_checklist_items: {
        Row: {
          id: string
          item_number: number
          label: string
          passed: boolean
          review_id: string
        }
        Insert: {
          id?: string
          item_number: number
          label: string
          passed: boolean
          review_id: string
        }
        Update: {
          id?: string
          item_number?: number
          label?: string
          passed?: boolean
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_checklist_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          initiative_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          initiative_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          initiative_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_initiative: { Args: { _initiative_id: string }; Returns: undefined }
      confirm_marketplace_connection: {
        Args: { _connection_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_party: {
        Args: { _conversation_id: string; _user: string }
        Returns: boolean
      }
      list_available_campaigns: {
        Args: never
        Returns: {
          budget: string
          business_name: string
          content_type: string
          created_at: string
          follower_range: string
          id: string
          language: string
          location: string
          niche: string
          platform: string
        }[]
      }
      list_awareness_videos: {
        Args: { _initiative_id: string }
        Returns: {
          avatar_url: string
          completed_at: string
          content_url: string
          display_name: string
          instagram_username: string
          participation_id: string
        }[]
      }
      list_initiative_participants: {
        Args: { _initiative_id: string }
        Returns: {
          avatar_url: string
          completed_at: string
          content_url: string
          creator_id: string
          display_name: string
          follower_count: number
          instagram_username: string
          location: string
          niche: string
          participation_id: string
          status: Database["public"]["Enums"]["participation_status"]
          supported_at: string
        }[]
      }
      list_open_campaigns: {
        Args: never
        Returns: {
          budget: string
          business_name: string
          content_type: string
          created_at: string
          follower_range: string
          id: string
          language: string
          location: string
          maximum_budget: number
          niche: string
          platform: string
          title: string
        }[]
      }
      list_participation_content_status: {
        Args: { _initiative_id: string }
        Returns: {
          content_status: string
          participation_id: string
        }[]
      }
      list_pending_awareness_videos: {
        Args: never
        Returns: {
          avatar_url: string
          completed_at: string
          content_url: string
          display_name: string
          initiative_id: string
          initiative_title: string
          instagram_username: string
          participation_id: string
        }[]
      }
      mark_conversation_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      open_marketplace_conversation: {
        Args: { _connection_id: string }
        Returns: {
          business_name: string
          conversation_id: string
          creator_avatar: string
          creator_name: string
          is_business: boolean
        }[]
      }
      respond_to_marketplace_connection: {
        Args: {
          _connection_id: string
          _decision: Database["public"]["Enums"]["connection_status"]
        }
        Returns: undefined
      }
      review_initiative: {
        Args: {
          _checklist: Json
          _comment: string
          _decision: Database["public"]["Enums"]["review_decision"]
          _initiative_id: string
        }
        Returns: undefined
      }
      review_participation_content: {
        Args: { _decision: string; _participation_id: string }
        Returns: undefined
      }
      select_campaign_bid: { Args: { _bid_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "creator" | "business" | "initiative_manager" | "reviewer"
      bid_status: "submitted" | "selected" | "not_selected"
      connection_status: "pending" | "accepted" | "declined" | "confirmed"
      creator_profile_status: "draft" | "submitted"
      initiative_status:
        | "draft"
        | "under_review"
        | "changes_required"
        | "active"
        | "closed"
      participation_status: "supported" | "completed"
      review_decision: "changes_required" | "approved"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["creator", "business", "initiative_manager", "reviewer"],
      bid_status: ["submitted", "selected", "not_selected"],
      connection_status: ["pending", "accepted", "declined", "confirmed"],
      creator_profile_status: ["draft", "submitted"],
      initiative_status: [
        "draft",
        "under_review",
        "changes_required",
        "active",
        "closed",
      ],
      participation_status: ["supported", "completed"],
      review_decision: ["changes_required", "approved"],
    },
  },
} as const
