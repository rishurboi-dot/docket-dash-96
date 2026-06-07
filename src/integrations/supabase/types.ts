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
      billing_records: {
        Row: {
          charge: number
          company_id: string | null
          created_at: string
          docket_number: string
          id: string
          mode: string | null
          rate_card_id: string | null
          report_id: string | null
          status: string
          weight: number | null
          zone_id: string | null
        }
        Insert: {
          charge?: number
          company_id?: string | null
          created_at?: string
          docket_number: string
          id?: string
          mode?: string | null
          rate_card_id?: string | null
          report_id?: string | null
          status?: string
          weight?: number | null
          zone_id?: string | null
        }
        Update: {
          charge?: number
          company_id?: string | null
          created_at?: string
          docket_number?: string
          id?: string
          mode?: string | null
          rate_card_id?: string | null
          report_id?: string | null
          status?: string
          weight?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "courier_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          name: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          zone_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string
          contact_email: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          contact_email?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      courier_report_rows: {
        Row: {
          created_at: string
          destination: string | null
          docket_number: string
          id: string
          mode: string | null
          raw: Json | null
          report_id: string
          weight: number | null
          zone_code: string | null
        }
        Insert: {
          created_at?: string
          destination?: string | null
          docket_number: string
          id?: string
          mode?: string | null
          raw?: Json | null
          report_id: string
          weight?: number | null
          zone_code?: string | null
        }
        Update: {
          created_at?: string
          destination?: string | null
          docket_number?: string
          id?: string
          mode?: string | null
          raw?: Json | null
          report_id?: string
          weight?: number | null
          zone_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_report_rows_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "courier_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_reports: {
        Row: {
          id: string
          name: string
          row_count: number
          uploaded_at: string
        }
        Insert: {
          id?: string
          name: string
          row_count?: number
          uploaded_at?: string
        }
        Update: {
          id?: string
          name?: string
          row_count?: number
          uploaded_at?: string
        }
        Relationships: []
      }
      dockets: {
        Row: {
          company_id: string | null
          docket_number: string
          id: string
          scanned_at: string
          status: string
        }
        Insert: {
          company_id?: string | null
          docket_number: string
          id?: string
          scanned_at?: string
          status?: string
        }
        Update: {
          company_id?: string | null
          docket_number?: string
          id?: string
          scanned_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dockets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_rates: {
        Row: {
          available: boolean
          created_at: string
          id: string
          max_weight_g: number | null
          min_weight_g: number
          quotation_id: string
          rate: number
          rate_unit: string
          zone_id: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          id?: string
          max_weight_g?: number | null
          min_weight_g?: number
          quotation_id: string
          rate?: number
          rate_unit?: string
          zone_id: string
        }
        Update: {
          available?: boolean
          created_at?: string
          id?: string
          max_weight_g?: number | null
          min_weight_g?: number
          quotation_id?: string
          rate?: number
          rate_unit?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_rates_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          mode: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          mode?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          base_charge: number
          company_id: string
          created_at: string
          id: string
          mode: string
          per_kg_charge: number
          weight_from: number
          weight_to: number
          zone_id: string
        }
        Insert: {
          base_charge?: number
          company_id: string
          created_at?: string
          id?: string
          mode?: string
          per_kg_charge?: number
          weight_from?: number
          weight_to?: number
          zone_id: string
        }
        Update: {
          base_charge?: number
          company_id?: string
          created_at?: string
          id?: string
          mode?: string
          per_kg_charge?: number
          weight_from?: number
          weight_to?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_cards_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
