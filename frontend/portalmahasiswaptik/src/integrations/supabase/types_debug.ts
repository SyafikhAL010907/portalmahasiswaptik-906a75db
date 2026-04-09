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
      announcements: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_new: boolean | null
          is_pinned: boolean | null
          priority: string | null
          target_classes: string[] | null
          title: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_new?: boolean | null
          is_pinned?: boolean | null
          priority?: string | null
          target_classes?: string[] | null
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_new?: boolean | null
          is_pinned?: boolean | null
          priority?: string | null
          target_classes?: string[] | null
          title?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          id: string
          latitude: number | null
          longitude: number | null
          method: string | null
          scanned_at: string | null
          session_id: string | null
          status: string | null
          student_id: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          latitude?: number | null
          longitude?: number | null
          method?: string | null
          scanned_at?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          latitude?: number | null
          longitude?: number | null
          method?: string | null
          scanned_at?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          class_id: string | null
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          lecturer_id: string | null
          meeting_id: string | null
          qr_code: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          lecturer_id?: string | null
          meeting_id?: string | null
          qr_code: string
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          lecturer_id?: string | null
          meeting_id?: string | null
          qr_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      class_achievements: {
        Row: {
          class_id: string
          competition_name: string
          created_at: string | null
          created_by: string | null
          event_date: string
          id: string
          rank: string
          student_names: string
        }
        Insert: {
          class_id: string
          competition_name: string
          created_at?: string | null
          created_by?: string | null
          event_date: string
          id?: string
          rank: string
          student_names: string
        }
        Update: {
          class_id?: string
          competition_name?: string
          created_at?: string | null
          created_by?: string | null
          event_date?: string
          id?: string
          rank?: string
          student_names?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_achievements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          badge: string | null
          category: string
          created_at: string | null
          created_by: string | null
          deadline: string
          description: string | null
          event_dates: string | null
          id: string
          link_url: string | null
          location: string | null
          organizer: string
          prize: string | null
          team_size: string | null
          title: string
        }
        Insert: {
          badge?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          deadline: string
          description?: string | null
          event_dates?: string | null
          id?: string
          link_url?: string | null
          location?: string | null
          organizer: string
          prize?: string | null
          team_size?: string | null
          title: string
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string
          description?: string | null
          event_dates?: string | null
          id?: string
          link_url?: string | null
          location?: string | null
          organizer?: string
          prize?: string | null
          team_size?: string | null
          title?: string
        }
        Relationships: []
      }
      download_logs: {
        Row: {
          created_at: string
          download_type: string | null
          downloaded_at: string
          id: string
          resource_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          download_type?: string | null
          downloaded_at?: string
          id?: string
          resource_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          download_type?: string | null
          downloaded_at?: string
          id?: string
          resource_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      global_configs: {
        Row: {
          billing_selected_month: number | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          billing_selected_month?: number | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          billing_selected_month?: number | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          external_url: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_pinned: boolean | null
          semester: number
          storage_type: string | null
          subject_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_pinned?: boolean | null
          semester: number
          storage_type?: string | null
          subject_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_pinned?: boolean | null
          semester?: number
          storage_type?: string | null
          subject_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string | null
          id: string
          meeting_number: number
          subject_id: string | null
          topic: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_number: number
          subject_id?: string | null
          topic?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_number?: number
          subject_id?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string | null
          recipient_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          recipient_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          recipient_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_end_month: number | null
          billing_start_month: number | null
          class_id: string | null
          created_at: string
          full_name: string
          id: string
          last_language: string | null
          last_selected_class: string | null
          last_selected_month: number | null
          nim: string
          payment_expires_at: string | null
          payment_status: string | null
          role: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          billing_end_month?: number | null
          billing_start_month?: number | null
          class_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          last_language?: string | null
          last_selected_class?: string | null
          last_selected_month?: number | null
          nim: string
          payment_expires_at?: string | null
          payment_status?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          billing_end_month?: number | null
          billing_start_month?: number | null
          class_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          last_language?: string | null
          last_selected_class?: string | null
          last_selected_month?: number | null
          nim?: string
          payment_expires_at?: string | null
          payment_status?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      public_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_chat_messages_profile_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription_data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      schedules: {
        Row: {
          class_id: string
          created_at: string
          day: string
          end_time: string
          id: string
          lecturer_id: string | null
          room: string
          start_time: string
          subject_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day: string
          end_time: string
          id?: string
          lecturer_id?: string | null
          room: string
          start_time: string
          subject_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day?: string
          end_time?: string
          id?: string
          lecturer_id?: string | null
          room?: string
          start_time?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          created_at: string
          drive_folder_id: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          drive_folder_id?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          drive_folder_id?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string
          created_at: string | null
          drive_folder_id: string | null
          id: string
          name: string
          semester: number
        }
        Insert: {
          code: string
          created_at?: string | null
          drive_folder_id?: string | null
          id?: string
          name: string
          semester: number
        }
        Update: {
          code?: string
          created_at?: string | null
          drive_folder_id?: string | null
          id?: string
          name?: string
          semester?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_subjects_semesters"
            columns: ["semester"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          class_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          nim: string | null
          proof_url: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          nim?: string | null
          proof_url?: string | null
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          nim?: string | null
          proof_url?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: []
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
      user_snippets: {
        Row: {
          code_content: string
          created_at: string | null
          id: string
          language: string
          last_accessed: string | null
          user_id: string
        }
        Insert: {
          code_content: string
          created_at?: string | null
          id?: string
          language: string
          last_accessed?: string | null
          user_id: string
        }
        Update: {
          code_content?: string
          created_at?: string | null
          id?: string
          language?: string
          last_accessed?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_dues: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: number | null
          paid_at: string | null
          proof_url: string | null
          status: string
          student_id: string
          student_nim: string | null
          verified_by: string | null
          week_number: number
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          month?: number | null
          paid_at?: string | null
          proof_url?: string | null
          status?: string
          student_id: string
          student_nim?: string | null
          verified_by?: string | null
          week_number: number
          year?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: number | null
          paid_at?: string | null
          proof_url?: string | null
          status?: string
          student_id?: string
          student_nim?: string | null
          verified_by?: string | null
          week_number?: number
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_download_quota: {
        Args: {
          _resource_id?: string
          _role: string
          _type: string
          _user_id: string
        }
        Returns: {
          remaining: number
          reset_at: string
          restricted: boolean
        }[]
      }
      delete_expired_messages: { Args: never; Returns: undefined }
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_batch_attendance_stats: { Args: never; Returns: Json }
      get_global_attendance_stats: { Args: never; Returns: Json }
      get_landing_stats: { Args: never; Returns: Json }
      get_user_class_id: { Args: { _user_id: string }; Returns: string }
      has_recent_download: {
        Args: { _material_id: string; _user_id: string }
        Returns: {
          available_at: string
          restricted: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_mahasiswa: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin_dev"
        | "admin_kelas"
        | "admin_dosen"
        | "mahasiswa"
        | "dosen"
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
      app_role: [
        "admin_dev",
        "admin_kelas",
        "admin_dosen",
        "mahasiswa",
        "dosen",
      ],
    },
  },
} as const
