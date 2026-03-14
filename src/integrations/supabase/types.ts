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
      abandoned_carts: {
        Row: {
          art_style: string | null
          category: string | null
          contact_email: string | null
          contact_first_name: string | null
          contact_phone: string | null
          created_at: string
          crop_data: Json | null
          dedication_text: string | null
          dream_job: string | null
          glitter_palette: string | null
          id: string
          kit_size: string | null
          last_recovery_sent_at: string | null
          last_recovery_status: string | null
          photo_uploaded: boolean
          product_type: string | null
          recovered_order_ref: string | null
          recovery_attempts: number
          recovery_channel: string | null
          recovered: boolean
          session_id: string
          stencil_detail_level: string | null
          step_reached: number
          updated_at: string
        }
        Insert: {
          art_style?: string | null
          category?: string | null
          contact_email?: string | null
          contact_first_name?: string | null
          contact_phone?: string | null
          created_at?: string
          crop_data?: Json | null
          dedication_text?: string | null
          dream_job?: string | null
          glitter_palette?: string | null
          id?: string
          kit_size?: string | null
          last_recovery_sent_at?: string | null
          last_recovery_status?: string | null
          photo_uploaded?: boolean
          product_type?: string | null
          recovered_order_ref?: string | null
          recovery_attempts?: number
          recovery_channel?: string | null
          recovered?: boolean
          session_id: string
          stencil_detail_level?: string | null
          step_reached?: number
          updated_at?: string
        }
        Update: {
          art_style?: string | null
          category?: string | null
          contact_email?: string | null
          contact_first_name?: string | null
          contact_phone?: string | null
          created_at?: string
          crop_data?: Json | null
          dedication_text?: string | null
          dream_job?: string | null
          glitter_palette?: string | null
          id?: string
          kit_size?: string | null
          last_recovery_sent_at?: string | null
          last_recovery_status?: string | null
          photo_uploaded?: boolean
          product_type?: string | null
          recovered_order_ref?: string | null
          recovery_attempts?: number
          recovery_channel?: string | null
          recovered?: boolean
          session_id?: string
          stencil_detail_level?: string | null
          step_reached?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_generation_runs: {
        Row: {
          category: string
          created_at: string
          dream_job: string | null
          error_message: string | null
          id: string
          metadata: Json
          model: string
          order_id: string | null
          provider: string
          requested_by: string
          result_image_url: string | null
          session_id: string | null
          source_image_urls: Json
        }
        Insert: {
          category: string
          created_at?: string
          dream_job?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          model: string
          order_id?: string | null
          provider?: string
          requested_by?: string
          result_image_url?: string | null
          session_id?: string | null
          source_image_urls?: Json
        }
        Update: {
          category?: string
          created_at?: string
          dream_job?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          model?: string
          order_id?: string | null
          provider?: string
          requested_by?: string
          result_image_url?: string | null
          session_id?: string | null
          source_image_urls?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_runs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          used_count?: number
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          category: string | null
          created_at: string
          event_name: string
          id: string
          metadata: Json
          order_ref: string | null
          session_id: string
          step: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          order_ref?: string | null
          session_id: string
          step?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          order_ref?: string | null
          session_id?: string
          step?: number | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          art_style: string | null
          category: string
          contact_email: string
          contact_first_name: string
          contact_last_name: string
          contact_phone: string
          courier_name: string | null
          coupon_code: string | null
          created_at: string
          crop_data: Json | null
          cropped_preview_url: string | null
          dedication_text: string | null
          delivered_at: string | null
          discount_amount: number
          dream_job: string | null
          fulfillment_note: string | null
          gift_message: string | null
          glitter_palette: string | null
          id: string
          instruction_code: string
          is_gift: boolean
          kit_size: string
          order_ref: string
          photo_url: string | null
          product_type: string
          shipped_at: string | null
          shipping_address: string
          shipping_city: string
          shipping_governorate: string
          shipping_postal_code: string | null
          stencil_detail_level: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          art_style?: string | null
          category?: string
          contact_email: string
          contact_first_name: string
          contact_last_name: string
          contact_phone: string
          courier_name?: string | null
          coupon_code?: string | null
          created_at?: string
          crop_data?: Json | null
          cropped_preview_url?: string | null
          dedication_text?: string | null
          delivered_at?: string | null
          discount_amount?: number
          dream_job?: string | null
          fulfillment_note?: string | null
          gift_message?: string | null
          glitter_palette?: string | null
          id?: string
          instruction_code: string
          is_gift?: boolean
          kit_size: string
          order_ref: string
          photo_url?: string | null
          product_type?: string
          shipped_at?: string | null
          shipping_address: string
          shipping_city: string
          shipping_governorate: string
          shipping_postal_code?: string | null
          stencil_detail_level?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          art_style?: string | null
          category?: string
          contact_email?: string
          contact_first_name?: string
          contact_last_name?: string
          contact_phone?: string
          courier_name?: string | null
          coupon_code?: string | null
          created_at?: string
          crop_data?: Json | null
          cropped_preview_url?: string | null
          dedication_text?: string | null
          delivered_at?: string | null
          discount_amount?: number
          dream_job?: string | null
          fulfillment_note?: string | null
          gift_message?: string | null
          glitter_palette?: string | null
          id?: string
          instruction_code?: string
          is_gift?: boolean
          kit_size?: string
          order_ref?: string
          photo_url?: string | null
          product_type?: string
          shipped_at?: string | null
          shipping_address?: string
          shipping_city?: string
          shipping_governorate?: string
          shipping_postal_code?: string | null
          stencil_detail_level?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_assets: {
        Row: {
          asset_kind: string
          created_at: string
          generation_run_id: string | null
          id: string
          label: string | null
          metadata: Json
          order_id: string
          url: string
        }
        Insert: {
          asset_kind: string
          created_at?: string
          generation_run_id?: string | null
          id?: string
          label?: string | null
          metadata?: Json
          order_id: string
          url: string
        }
        Update: {
          asset_kind?: string
          created_at?: string
          generation_run_id?: string | null
          id?: string
          label?: string | null
          metadata?: Json
          order_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assets_generation_run_id_fkey"
            columns: ["generation_run_id"]
            isOneToOne: false
            referencedRelation: "ai_generation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          courier_name: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          source: string
          status: Database["public"]["Enums"]["order_status"]
          tracking_number: string | null
        }
        Insert: {
          courier_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          source?: string
          status: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
        }
        Update: {
          courier_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      regeneration_requests: {
        Row: {
          admin_note: string | null
          client_ip: string
          created_at: string
          id: string
          order_id: string
          order_ref: string
          original_photo_url: string | null
          reason: string
          regenerated_photo_url: string | null
          status: Database["public"]["Enums"]["regen_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          client_ip: string
          created_at?: string
          id?: string
          order_id: string
          order_ref: string
          original_photo_url?: string | null
          reason: string
          regenerated_photo_url?: string | null
          status?: Database["public"]["Enums"]["regen_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          client_ip?: string
          created_at?: string
          id?: string
          order_id?: string
          order_ref?: string
          original_photo_url?: string | null
          reason?: string
          regenerated_photo_url?: string | null
          status?: Database["public"]["Enums"]["regen_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regeneration_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      site_assets: {
        Row: {
          key: string
          updated_at: string
          url: string
        }
        Insert: {
          key: string
          updated_at?: string
          url: string
        }
        Update: {
          key?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "confirmed" | "processing" | "shipped" | "delivered"
      regen_status: "pending" | "in_progress" | "completed" | "rejected"
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
      app_role: ["admin", "user"],
      order_status: ["confirmed", "processing", "shipped", "delivered"],
      regen_status: ["pending", "in_progress", "completed", "rejected"],
    },
  },
} as const
