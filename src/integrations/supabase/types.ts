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
          id: string
          kit_size: string | null
          photo_uploaded: boolean
          recovered: boolean
          session_id: string
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
          id?: string
          kit_size?: string | null
          photo_uploaded?: boolean
          recovered?: boolean
          session_id: string
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
          id?: string
          kit_size?: string | null
          photo_uploaded?: boolean
          recovered?: boolean
          session_id?: string
          step_reached?: number
          updated_at?: string
        }
        Relationships: []
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
      orders: {
        Row: {
          art_style: string
          category: string
          contact_email: string
          contact_first_name: string
          contact_last_name: string
          contact_phone: string
          coupon_code: string | null
          created_at: string
          cropped_preview_url: string | null
          discount_amount: number
          dream_job: string | null
          gift_message: string | null
          id: string
          instruction_code: string
          is_gift: boolean
          kit_size: string
          order_ref: string
          photo_url: string | null
          shipping_address: string
          shipping_city: string
          shipping_governorate: string
          shipping_postal_code: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          art_style: string
          category?: string
          contact_email: string
          contact_first_name: string
          contact_last_name: string
          contact_phone: string
          coupon_code?: string | null
          created_at?: string
          cropped_preview_url?: string | null
          discount_amount?: number
          dream_job?: string | null
          gift_message?: string | null
          id?: string
          instruction_code: string
          is_gift?: boolean
          kit_size: string
          order_ref: string
          photo_url?: string | null
          shipping_address: string
          shipping_city: string
          shipping_governorate: string
          shipping_postal_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          art_style?: string
          category?: string
          contact_email?: string
          contact_first_name?: string
          contact_last_name?: string
          contact_phone?: string
          coupon_code?: string | null
          created_at?: string
          cropped_preview_url?: string | null
          discount_amount?: number
          dream_job?: string | null
          gift_message?: string | null
          id?: string
          instruction_code?: string
          is_gift?: boolean
          kit_size?: string
          order_ref?: string
          photo_url?: string | null
          shipping_address?: string
          shipping_city?: string
          shipping_governorate?: string
          shipping_postal_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: []
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
