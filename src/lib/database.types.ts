export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      backup_runs: {
        Row: {
          destination: string
          error: string | null
          finished_at: string | null
          id: number
          kind: string
          size_bytes: number | null
          started_at: string
          status: string
          storage_key: string | null
          triggered_by: string | null
        }
        Insert: {
          destination: string
          error?: string | null
          finished_at?: string | null
          id?: number
          kind: string
          size_bytes?: number | null
          started_at?: string
          status?: string
          storage_key?: string | null
          triggered_by?: string | null
        }
        Update: {
          destination?: string
          error?: string | null
          finished_at?: string | null
          id?: number
          kind?: string
          size_bytes?: number | null
          started_at?: string
          status?: string
          storage_key?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string
          created_at: string
          deleted_at: string | null
          id: number
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_purchases: {
        Row: {
          company_id: number | null
          created_at: string
          deleted_at: string | null
          dollar: number
          id: number
          is_finished: boolean
          name: string
          note: string | null
          product_id: number | null
          purchase_date: string
          quantity: number | null
          total_amount: number
          total_remaining: number
          type: Database["public"]["Enums"]["company_purchase_type"]
          updated_at: string
          warehouse_id: number | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string
          deleted_at?: string | null
          dollar: number
          id?: number
          is_finished?: boolean
          name: string
          note?: string | null
          product_id?: number | null
          purchase_date: string
          quantity?: number | null
          total_amount: number
          total_remaining?: number
          type?: Database["public"]["Enums"]["company_purchase_type"]
          updated_at?: string
          warehouse_id?: number | null
        }
        Update: {
          company_id?: number | null
          created_at?: string
          deleted_at?: string | null
          dollar?: number
          id?: number
          is_finished?: boolean
          name?: string
          note?: string | null
          product_id?: number | null
          purchase_date?: string
          quantity?: number | null
          total_amount?: number
          total_remaining?: number
          type?: Database["public"]["Enums"]["company_purchase_type"]
          updated_at?: string
          warehouse_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_purchases_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_purchases_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_purchases_warehouse_id_fkey"
            columns: ["warehouse_id"]
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          created_at: string
          deleted_at: string | null
          id: number
          is_salaried_employee: boolean
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          is_salaried_employee?: boolean
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          deleted_at?: string | null
          id?: number
          is_salaried_employee?: boolean
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      dollar: {
        Row: {
          created_at: string
          id: number
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      dollar_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: number
          price: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: number
          price: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: number
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "dollar_history_changed_by_fkey"
            columns: ["changed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_actions: {
        Row: {
          action_date: string
          amount: number
          created_at: string
          dollar: number
          employee_id: number | null
          id: number
          note: string | null
          type: Database["public"]["Enums"]["employee_action_type"]
          updated_at: string
        }
        Insert: {
          action_date: string
          amount: number
          created_at?: string
          dollar: number
          employee_id?: number | null
          id?: number
          note?: string | null
          type: Database["public"]["Enums"]["employee_action_type"]
          updated_at?: string
        }
        Update: {
          action_date?: string
          amount?: number
          created_at?: string
          dollar?: number
          employee_id?: number | null
          id?: number
          note?: string | null
          type?: Database["public"]["Enums"]["employee_action_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_actions_employee_id_fkey"
            columns: ["employee_id"]
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          dollar: number
          id: number
          image_url: string | null
          month_salary: number
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          dollar: number
          id?: number
          image_url?: string | null
          month_salary: number
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          dollar?: number
          id?: number
          image_url?: string | null
          month_salary?: number
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          deleted_at: string | null
          dollar: number
          id: number
          note: string | null
          title: string
          updated_at: string
          warehouse_id: number | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          dollar: number
          id?: number
          note?: string | null
          title: string
          updated_at?: string
          warehouse_id?: number | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          dollar?: number
          id?: number
          note?: string | null
          title?: string
          updated_at?: string
          warehouse_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_loans: {
        Row: {
          amount: number
          created_at: string
          id: number
          note: string | null
          paid_at: string
          sale_id: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          note?: string | null
          paid_at: string
          sale_id?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          note?: string | null
          paid_at?: string
          sale_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paid_loans_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_catalog: {
        Row: {
          action: string
          label: string
          resource: string
        }
        Insert: {
          action: string
          label: string
          resource: string
        }
        Update: {
          action?: string
          label?: string
          resource?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          deleted_at: string | null
          dollar: number
          grains_per_carton: number | null
          id: number
          image_url: string | null
          name: string
          price: number
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          dollar: number
          grains_per_carton?: number | null
          id?: number
          image_url?: string | null
          name: string
          price: number
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          dollar?: number
          grains_per_carton?: number | null
          id?: number
          image_url?: string | null
          name?: string
          price?: number
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          image_url?: string | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      purchase_payments: {
        Row: {
          amount: number
          company_purchase_id: number | null
          created_at: string
          id: number
          note: string | null
          paid_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_purchase_id?: number | null
          created_at?: string
          id?: number
          note?: string | null
          paid_at: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_purchase_id?: number | null
          created_at?: string
          id?: number
          note?: string | null
          paid_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_payments_company_purchase_id_fkey"
            columns: ["company_purchase_id"]
            referencedRelation: "company_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: number
          name: string
          price: number
          product_id: number | null
          quantity: number
          sale_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          price: number
          product_id?: number | null
          quantity: number
          sale_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          price?: number
          product_id?: number | null
          quantity?: number
          sale_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: number | null
          deleted_at: string | null
          discount: number
          dollar: number
          fast_sale: boolean
          id: number
          is_finished: boolean
          monthly_paid: number
          note: string | null
          sale_date: string
          sale_number: string
          sale_type: Database["public"]["Enums"]["sale_type"]
          total_amount: number
          total_remaining: number
          updated_at: string
          warehouse_id: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: number | null
          deleted_at?: string | null
          discount?: number
          dollar: number
          fast_sale?: boolean
          id?: number
          is_finished?: boolean
          monthly_paid?: number
          note?: string | null
          sale_date?: string
          sale_number: string
          sale_type?: Database["public"]["Enums"]["sale_type"]
          total_amount?: number
          total_remaining?: number
          updated_at?: string
          warehouse_id?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: number | null
          deleted_at?: string | null
          discount?: number
          dollar?: number
          fast_sale?: boolean
          id?: number
          is_finished?: boolean
          monthly_paid?: number
          note?: string | null
          sale_date?: string
          sale_number?: string
          sale_type?: Database["public"]["Enums"]["sale_type"]
          total_amount?: number
          total_remaining?: number
          updated_at?: string
          warehouse_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string
          filename: string
        }
        Insert: {
          applied_at?: string
          filename: string
        }
        Update: {
          applied_at?: string
          filename?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          accent_color: string
          address: string | null
          backup_cron: string
          backup_keep_n: number
          backup_last_run_at: string | null
          backup_last_status: string | null
          backup_provider: string
          base_currency: string
          city: string | null
          country: string
          created_at: string
          default_dollar_rate: number
          direction: string
          display_currency: string
          email: string | null
          factory_name: string
          favicon_url: string | null
          fiscal_year_start_month: number
          id: number
          language: string
          legal_name: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string
          r2_access_key_id: string | null
          r2_bucket: string
          r2_endpoint: string | null
          r2_secret_access_key: string | null
          setup_completed: boolean
          tagline: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          address?: string | null
          backup_cron?: string
          backup_keep_n?: number
          backup_last_run_at?: string | null
          backup_last_status?: string | null
          backup_provider?: string
          base_currency?: string
          city?: string | null
          country?: string
          created_at?: string
          default_dollar_rate?: number
          direction?: string
          display_currency?: string
          email?: string | null
          factory_name?: string
          favicon_url?: string | null
          fiscal_year_start_month?: number
          id?: number
          language?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string
          r2_access_key_id?: string | null
          r2_bucket?: string
          r2_endpoint?: string | null
          r2_secret_access_key?: string | null
          setup_completed?: boolean
          tagline?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          address?: string | null
          backup_cron?: string
          backup_keep_n?: number
          backup_last_run_at?: string | null
          backup_last_status?: string | null
          backup_provider?: string
          base_currency?: string
          city?: string | null
          country?: string
          created_at?: string
          default_dollar_rate?: number
          direction?: string
          display_currency?: string
          email?: string | null
          factory_name?: string
          favicon_url?: string | null
          fiscal_year_start_month?: number
          id?: number
          language?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string
          r2_access_key_id?: string | null
          r2_bucket?: string
          r2_endpoint?: string | null
          r2_secret_access_key?: string | null
          setup_completed?: boolean
          tagline?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          action: string
          granted_at: string
          granted_by: string | null
          profile_id: string
          resource: string
        }
        Insert: {
          action: string
          granted_at?: string
          granted_by?: string | null
          profile_id: string
          resource: string
        }
        Update: {
          action?: string
          granted_at?: string
          granted_by?: string | null
          profile_id?: string
          resource?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_resource_action_fkey"
            columns: ["resource", "action"]
            referencedRelation: "permission_catalog"
            referencedColumns: ["resource", "action"]
          },
        ]
      }
      warehouse_adjustments: {
        Row: {
          adjusted_at: string
          adjusted_by: string | null
          delta: number
          id: number
          product_id: number
          reason: string
          warehouse_id: number
        }
        Insert: {
          adjusted_at?: string
          adjusted_by?: string | null
          delta: number
          id?: number
          product_id: number
          reason: string
          warehouse_id: number
        }
        Update: {
          adjusted_at?: string
          adjusted_by?: string | null
          delta?: number
          id?: number
          product_id?: number
          reason?: string
          warehouse_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_adjustments_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_products: {
        Row: {
          id: number
          product_id: number
          qty: number
          updated_at: string
          warehouse_id: number
        }
        Insert: {
          id?: number
          product_id: number
          qty?: number
          updated_at?: string
          warehouse_id: number
        }
        Update: {
          id?: number
          product_id?: number
          qty?: number
          updated_at?: string
          warehouse_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_products_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_products_warehouse_id_fkey"
            columns: ["warehouse_id"]
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_users: {
        Row: {
          created_at: string
          id: number
          profile_id: string
          warehouse_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          profile_id: string
          warehouse_id: number
        }
        Update: {
          created_at?: string
          id?: number
          profile_id?: string
          warehouse_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_users_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_users_warehouse_id_fkey"
            columns: ["warehouse_id"]
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: number
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: number
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: number
          location?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_warehouse_qty: {
        Args: { p_delta: number; p_product_id: number; p_warehouse_id: number }
        Returns: undefined
      }
      adjust_warehouse_qty_audited: {
        Args: {
          p_delta: number
          p_product_id: number
          p_reason: string
          p_warehouse_id: number
        }
        Returns: undefined
      }
      create_purchase: {
        Args: {
          p_company_id: number
          p_dollar: number
          p_name: string
          p_note: string
          p_product_id: number
          p_purchase_date: string
          p_quantity: number
          p_total_amount: number
          p_type: string
          p_warehouse_id: number
        }
        Returns: number
      }
      create_sale: {
        Args: {
          p_customer_id: number
          p_discount: number
          p_dollar: number
          p_items: Json
          p_note: string
          p_sale_number: string
          p_sale_type: string
          p_warehouse_id: number
        }
        Returns: number
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      hard_delete_purchase: {
        Args: { p_purchase_id: number }
        Returns: undefined
      }
      hard_delete_record: {
        Args: { p_entity: string; p_id: number }
        Returns: undefined
      }
      hard_delete_record_uuid: {
        Args: { p_entity: string; p_id: string }
        Returns: undefined
      }
      hard_delete_sale: { Args: { p_sale_id: number }; Returns: undefined }
      has_permission: {
        Args: { p_action: string; p_resource: string }
        Returns: boolean
      }
      invoke_backup_fn: { Args: never; Returns: undefined }
      is_admin_or_owner: { Args: never; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      reset_public_sequences: { Args: never; Returns: undefined }
      restore_purchase: { Args: { p_purchase_id: number }; Returns: undefined }
      restore_record: {
        Args: { p_entity: string; p_id: number }
        Returns: undefined
      }
      restore_record_uuid: {
        Args: { p_entity: string; p_id: string }
        Returns: undefined
      }
      restore_sale: { Args: { p_sale_id: number }; Returns: undefined }
      soft_delete_purchase: {
        Args: { p_purchase_id: number }
        Returns: undefined
      }
      soft_delete_sale: { Args: { p_sale_id: number }; Returns: undefined }
      transfer_ownership: { Args: { new_owner: string }; Returns: undefined }
    }
    Enums: {
      company_purchase_type: "CASH" | "LOAN"
      employee_action_type:
        | "PUNISHMENT"
        | "BONUS"
        | "ABSENT"
        | "OVERTIME"
        | "TERMINATE"
      sale_type: "CASH" | "LOAN"
      unit_type: "METER" | "PIECE"
      user_role: "OWNER" | "ADMIN" | "USER"
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
      company_purchase_type: ["CASH", "LOAN"],
      employee_action_type: [
        "PUNISHMENT",
        "BONUS",
        "ABSENT",
        "OVERTIME",
        "TERMINATE",
      ],
      sale_type: ["CASH", "LOAN"],
      unit_type: ["METER", "PIECE"],
      user_role: ["OWNER", "ADMIN", "USER"],
    },
  },
} as const
