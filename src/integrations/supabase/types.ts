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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          id: number
          message: string
          poltrona_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          message: string
          poltrona_id: string
        }
        Update: {
          created_at?: string
          id?: number
          message?: string
          poltrona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_poltrona_log"
            columns: ["poltrona_id"]
            isOneToOne: false
            referencedRelation: "poltronas"
            referencedColumns: ["poltrona_id"]
          },
          {
            foreignKeyName: "fk_poltrona_log"
            columns: ["poltrona_id"]
            isOneToOne: false
            referencedRelation: "poltronas_public"
            referencedColumns: ["poltrona_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string
          id: string
          payment_id: number
          poltrona_id: string
          status: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string
          id?: string
          payment_id: number
          poltrona_id: string
          status?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string
          id?: string
          payment_id?: number
          poltrona_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_poltrona"
            columns: ["poltrona_id"]
            isOneToOne: false
            referencedRelation: "poltronas"
            referencedColumns: ["poltrona_id"]
          },
          {
            foreignKeyName: "fk_poltrona"
            columns: ["poltrona_id"]
            isOneToOne: false
            referencedRelation: "poltronas_public"
            referencedColumns: ["poltrona_id"]
          },
        ]
      }
      poltrona_maintenance: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          maintenance_type: string
          notes: string | null
          performed_by: string | null
          poltrona_id: string
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_type: string
          notes?: string | null
          performed_by?: string | null
          poltrona_id: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_type?: string
          notes?: string | null
          performed_by?: string | null
          poltrona_id?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_poltrona"
            columns: ["poltrona_id"]
            isOneToOne: false
            referencedRelation: "poltronas"
            referencedColumns: ["poltrona_id"]
          },
          {
            foreignKeyName: "fk_poltrona"
            columns: ["poltrona_id"]
            isOneToOne: false
            referencedRelation: "poltronas_public"
            referencedColumns: ["poltrona_id"]
          },
        ]
      }
      poltrona_status: {
        Row: {
          error_message: string | null
          firmware_version: string | null
          is_online: boolean
          last_ping: string | null
          poltrona_id: string
          updated_at: string
        }
        Insert: {
          error_message?: string | null
          firmware_version?: string | null
          is_online?: boolean
          last_ping?: string | null
          poltrona_id: string
          updated_at?: string
        }
        Update: {
          error_message?: string | null
          firmware_version?: string | null
          is_online?: boolean
          last_ping?: string | null
          poltrona_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_poltrona_status"
            columns: ["poltrona_id"]
            isOneToOne: true
            referencedRelation: "poltronas"
            referencedColumns: ["poltrona_id"]
          },
          {
            foreignKeyName: "fk_poltrona_status"
            columns: ["poltrona_id"]
            isOneToOne: true
            referencedRelation: "poltronas_public"
            referencedColumns: ["poltrona_id"]
          },
        ]
      }
      poltronas: {
        Row: {
          active: boolean
          created_at: string
          duration: number
          id: string
          ip: string
          location: string
          pix_key: string
          poltrona_id: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration?: number
          id?: string
          ip: string
          location: string
          pix_key: string
          poltrona_id: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration?: number
          id?: string
          ip?: string
          location?: string
          pix_key?: string
          poltrona_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      payment_stats: {
        Row: {
          avg_amount: number | null
          date: string | null
          poltrona_id: string | null
          total_amount: number | null
          total_payments: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_poltrona"
            columns: ["poltrona_id"]
            isOneToOne: false
            referencedRelation: "poltronas"
            referencedColumns: ["poltrona_id"]
          },
          {
            foreignKeyName: "fk_poltrona"
            columns: ["poltrona_id"]
            isOneToOne: false
            referencedRelation: "poltronas_public"
            referencedColumns: ["poltrona_id"]
          },
        ]
      }
      poltronas_public: {
        Row: {
          active: boolean | null
          created_at: string | null
          duration: number | null
          id: string | null
          ip: string | null
          location: string | null
          poltrona_id: string | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: string | null
          ip?: string | null
          location?: string | null
          poltrona_id?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: string | null
          ip?: string | null
          location?: string | null
          poltrona_id?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
