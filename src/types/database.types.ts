export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      conciliaciones: {
        Row: {
          confirmado_at: string | null
          confirmado_por: string | null
          created_at: string
          desglose: Json
          estado: string
          id: string
          origen: string
          pago_id: string
          pedido_id: string
          score: number
        }
        Insert: {
          confirmado_at?: string | null
          confirmado_por?: string | null
          created_at?: string
          desglose: Json
          estado: string
          id?: string
          origen: string
          pago_id: string
          pedido_id: string
          score: number
        }
        Update: {
          confirmado_at?: string | null
          confirmado_por?: string | null
          created_at?: string
          desglose?: Json
          estado?: string
          id?: string
          origen?: string
          pago_id?: string
          pedido_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "conciliaciones_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          clave: string
          valor: Json
        }
        Insert: {
          clave: string
          valor: Json
        }
        Update: {
          clave?: string
          valor?: Json
        }
        Relationships: []
      }
      correos_banco: {
        Row: {
          asunto: string | null
          capturado_at: string
          cuerpo: string
          error: string | null
          id: number
          mensaje_id: string
          motivo_sin_pago: string | null
          procesado_ok: boolean | null
          recibido_at: string
          remitente: string
          uid_imap: number | null
        }
        Insert: {
          asunto?: string | null
          capturado_at?: string
          cuerpo: string
          error?: string | null
          id?: number
          mensaje_id: string
          motivo_sin_pago?: string | null
          procesado_ok?: boolean | null
          recibido_at: string
          remitente: string
          uid_imap?: number | null
        }
        Update: {
          asunto?: string | null
          capturado_at?: string
          cuerpo?: string
          error?: string | null
          id?: number
          mensaje_id?: string
          motivo_sin_pago?: string | null
          procesado_ok?: boolean | null
          recibido_at?: string
          remitente?: string
          uid_imap?: number | null
        }
        Relationships: []
      }
      pagos: {
        Row: {
          confianza_extraccion: number | null
          correo_id: number
          created_at: string
          cuerpo_correo: string
          fecha_pago: string
          id: string
          mensaje_id: string
          metodo_extraccion: string
          moneda: string
          monto_centimos: number
          referencia_detalle: string | null
          remitente_nombre: string | null
        }
        Insert: {
          confianza_extraccion?: number | null
          correo_id: number
          created_at?: string
          cuerpo_correo: string
          fecha_pago: string
          id?: string
          mensaje_id: string
          metodo_extraccion: string
          moneda?: string
          monto_centimos: number
          referencia_detalle?: string | null
          remitente_nombre?: string | null
        }
        Update: {
          confianza_extraccion?: number | null
          correo_id?: number
          created_at?: string
          cuerpo_correo?: string
          fecha_pago?: string
          id?: string
          mensaje_id?: string
          metodo_extraccion?: string
          moneda?: string
          monto_centimos?: number
          referencia_detalle?: string | null
          remitente_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_correo_id_fkey"
            columns: ["correo_id"]
            isOneToOne: false
            referencedRelation: "correos_banco"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_email: string | null
          cliente_nombre: string
          cliente_telefono: string | null
          created_at: string
          estado_pago: string
          estado_woo: string
          fecha_pedido: string
          id: string
          moneda: string
          numero_pedido: string
          raw: Json
          total_centimos: number
          updated_at: string
          woo_order_id: number
        }
        Insert: {
          cliente_email?: string | null
          cliente_nombre: string
          cliente_telefono?: string | null
          created_at?: string
          estado_pago?: string
          estado_woo: string
          fecha_pedido: string
          id?: string
          moneda?: string
          numero_pedido: string
          raw: Json
          total_centimos: number
          updated_at?: string
          woo_order_id: number
        }
        Update: {
          cliente_email?: string | null
          cliente_nombre?: string
          cliente_telefono?: string | null
          created_at?: string
          estado_pago?: string
          estado_woo?: string
          fecha_pedido?: string
          id?: string
          moneda?: string
          numero_pedido?: string
          raw?: Json
          total_centimos?: number
          updated_at?: string
          woo_order_id?: number
        }
        Relationships: []
      }
      webhook_eventos: {
        Row: {
          error: string | null
          firma_valida: boolean
          fuente: string
          id: number
          payload: Json
          procesado_ok: boolean | null
          recibido_at: string
          topic: string | null
        }
        Insert: {
          error?: string | null
          firma_valida: boolean
          fuente: string
          id?: number
          payload: Json
          procesado_ok?: boolean | null
          recibido_at?: string
          topic?: string | null
        }
        Update: {
          error?: string | null
          firma_valida?: boolean
          fuente?: string
          id?: number
          payload?: Json
          procesado_ok?: boolean | null
          recibido_at?: string
          topic?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      candidatos_de_pago: {
        Args: { p_pago_id: string }
        Returns: {
          desglose: Json
          pedido_id: string
          score: number
        }[]
      }
      conciliar_pago: { Args: { p_pago_id: string }; Returns: undefined }
      contar_correos_sin_procesar: { Args: never; Returns: number }
      disparar_correo_poll: { Args: never; Returns: undefined }
      leer_config_numero: { Args: { p_clave: string }; Returns: number }
      resolver_conciliacion: {
        Args: { p_conciliacion_id: string; p_confirmar: boolean }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      upsert_pedido: { Args: { p: Json }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

