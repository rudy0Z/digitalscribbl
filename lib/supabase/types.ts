// Auto-generate the real version with:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
// Below is the hand-typed version that matches the schema in supabase/migrations/001_schema.sql.
// The structure must match what @supabase/supabase-js@2.44+ expects (including Relationships).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type BodyStyle = 'M1' | 'M2' | 'M3' | 'F1' | 'F2' | 'F3'
export type ShirtPermission = 'open' | 'batch_only' | 'request_only' | 'locked'
export type Panel = 'front' | 'back' | 'sleeves'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type ExportRequestType = 'batch' | 'group'
export type ExportRequestStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled'
export type NotificationType =
  | 'scribble_received'
  | 'scribble_live'
  | 'request_received'
  | 'request_approved'
  | 'request_rejected'
  | 'shirt_unlocked'
  | 'admin_broadcast'
  | 'scribble_removed'
  | 'scribble_reaction'

export type Database = {
  public: {
    Tables: {
      academic_groups: {
        Row:    { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { id?: string; name?: string; created_at?: string }
        Relationships: []
      }
      programs: {
        Row:    { id: string; academic_group_id: string; name: string; created_at: string }
        Insert: { id?: string; academic_group_id: string; name: string; created_at?: string }
        Update: { id?: string; academic_group_id?: string; name?: string; created_at?: string }
        Relationships: []
      }
      batches: {
        Row:    { id: string; program_id: string; graduation_year: number; label: string | null; created_at: string }
        Insert: { id?: string; program_id: string; graduation_year: number; label?: string | null; created_at?: string }
        Update: { graduation_year?: number; label?: string | null }
        Relationships: []
      }
      users: {
        Row: {
          id:                   string
          email:                string
          display_name:         string
          enrollment_number:    string | null
          academic_group_id:    string | null
          program_id:           string | null
          batch_id:             string | null
          body_style:           string
          shirt_color:          string
          head_front_url:       string | null
          head_back_url:        string | null
          yearbook_quote:       string | null
          shirt_permission:     string
          is_admin:             boolean
          is_suspended:         boolean
          last_seen:            string | null
          onboarding_completed: boolean
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id:                    string
          email:                 string
          display_name:          string
          enrollment_number?:    string | null
          academic_group_id?:    string | null
          program_id?:           string | null
          batch_id?:             string | null
          body_style?:           string
          shirt_color?:          string
          head_front_url?:       string | null
          head_back_url?:        string | null
          yearbook_quote?:       string | null
          shirt_permission?:     string
          is_admin?:             boolean
          is_suspended?:         boolean
          onboarding_completed?: boolean
        }
        Update: {
          display_name?:         string
          enrollment_number?:    string | null
          academic_group_id?:    string | null
          program_id?:           string | null
          batch_id?:             string | null
          body_style?:           string
          shirt_color?:          string
          head_front_url?:       string | null
          head_back_url?:        string | null
          yearbook_quote?:       string | null
          shirt_permission?:     string
          is_admin?:             boolean
          is_suspended?:         boolean
          last_seen?:            string | null
          onboarding_completed?: boolean
          updated_at?:           string
        }
        Relationships: []
      }
      shirts: {
        Row: {
          id:                  string
          owner_id:            string
          shirt_number:        number
          front_texture_url:   string | null
          back_texture_url:    string | null
          sleeves_texture_url: string | null
          front_occupancy:     number
          back_occupancy:      number
          sleeves_occupancy:   number
          is_locked:           boolean
          created_at:          string
        }
        Insert: {
          id?:                  string
          owner_id:             string
          shirt_number?:        number
          front_texture_url?:   string | null
          back_texture_url?:    string | null
          sleeves_texture_url?: string | null
          front_occupancy?:     number
          back_occupancy?:      number
          sleeves_occupancy?:   number
          is_locked?:           boolean
        }
        Update: {
          front_texture_url?:   string | null
          back_texture_url?:    string | null
          sleeves_texture_url?: string | null
          front_occupancy?:     number
          back_occupancy?:      number
          sleeves_occupancy?:   number
          is_locked?:           boolean
        }
        Relationships: []
      }
      scribbles: {
        Row: {
          id:             string
          shirt_id:       string
          scribbler_id:   string
          panel:          string
          x:              number
          y:              number
          w:              number
          h:              number
          canvas_json:    Json
          canvas_svg:     string | null
          canvas_png_url: string | null  // deprecated — kept for backward compat
          is_flagged:     boolean
          flag_count:     number
          is_hidden:      boolean
          created_at:     string
        }
        Insert: {
          id?:             string
          shirt_id:        string
          scribbler_id:    string
          panel:           string
          x:               number
          y:               number
          w:               number
          h:               number
          canvas_json:     Json
          canvas_svg?:     string | null
          canvas_png_url?: string | null
          is_flagged?:     boolean
          flag_count?:     number
          is_hidden?:      boolean
        }
        Update: {
          canvas_svg?:     string | null
          canvas_png_url?: string | null
          is_flagged?:     boolean
          flag_count?:     number
          is_hidden?:      boolean
        }
        Relationships: []
      }
      box_claims: {
        Row: {
          id:         string
          shirt_id:   string
          user_id:    string
          panel:      string
          x:          number
          y:          number
          w:          number
          h:          number
          claimed_at: string
          expires_at: string
        }
        Insert: {
          id?:        string
          shirt_id:   string
          user_id:    string
          panel:      string
          x:          number
          y:          number
          w:          number
          h:          number
          expires_at?: string
        }
        Update: {
          x?:          number
          y?:          number
          w?:          number
          h?:          number
          expires_at?: string
        }
        Relationships: []
      }
      scribble_requests: {
        Row: {
          id:           string
          requester_id: string
          owner_id:     string
          status:       string
          created_at:   string
          responded_at: string | null
        }
        Insert: {
          id?:           string
          requester_id:  string
          owner_id:      string
          status?:       string
        }
        Update: {
          status?:       string
          responded_at?: string | null
        }
        Relationships: []
      }
      friend_groups: {
        Row: {
          id:           string
          name:         string
          admin_id:     string
          invite_token: string
          created_at:   string
        }
        Insert: {
          id?:           string
          name:          string
          admin_id:      string
          invite_token?: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      friend_group_members: {
        Row:    { group_id: string; user_id: string; joined_at: string }
        Insert: { group_id: string; user_id: string }
        Update: Record<string, never>
        Relationships: []
      }
      notifications: {
        Row: {
          id:                  string
          user_id:             string
          type:                string
          title:               string
          body:                string | null
          related_user_id:     string | null
          related_shirt_id:    string | null
          related_scribble_id: string | null
          is_read:             boolean
          created_at:          string
        }
        Insert: {
          id?:                  string
          user_id:              string
          type:                 string
          title:                string
          body?:                string | null
          related_user_id?:     string | null
          related_shirt_id?:    string | null
          related_scribble_id?: string | null
          is_read?:             boolean
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }
      scribble_reports: {
        Row:    { id: string; scribble_id: string; reporter_id: string; created_at: string }
        Insert: { id?: string; scribble_id: string; reporter_id: string }
        Update: Record<string, never>
        Relationships: []
      }
      scribble_reactions: {
        Row:    { id: string; scribble_id: string; user_id: string; emoji: string; created_at: string }
        Insert: { id?: string; scribble_id: string; user_id: string; emoji: string; created_at?: string }
        Update: Record<string, never>
        Relationships: []
      }
      export_requests: {
        Row: {
          id:           string
          requester_id: string
          request_type: string
          batch_id:     string | null
          group_id:     string | null
          note:         string | null
          status:       string
          admin_note:   string | null
          created_at:   string
          updated_at:   string
          resolved_at:  string | null
          resolved_by:  string | null
        }
        Insert: {
          id?:           string
          requester_id:  string
          request_type:  string
          batch_id?:     string | null
          group_id?:     string | null
          note?:         string | null
          status?:       string
          admin_note?:   string | null
          created_at?:   string
          updated_at?:   string
          resolved_at?:  string | null
          resolved_by?:  string | null
        }
        Update: {
          status?:      string
          admin_note?:  string | null
          updated_at?:  string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          id:          string
          user_id:     string | null
          route:       string
          error_code:  string | null
          message:     string
          metadata:    Json
          user_agent:  string | null
          created_at:  string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?:         string
          user_id?:    string | null
          route:       string
          error_code?: string | null
          message:     string
          metadata?:   Json
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row:    { key: string; value: Json; updated_at: string; updated_by: string | null }
        Insert: { key: string; value: Json; updated_by?: string | null }
        Update: { value?: Json; updated_at?: string; updated_by?: string | null }
        Relationships: []
      }
    }
    Views:          Record<string, never>
    Functions:      Record<string, never>
    Enums:          Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type UserRow           = Database['public']['Tables']['users']['Row']
export type ShirtRow          = Database['public']['Tables']['shirts']['Row']
export type ScribbleRow       = Database['public']['Tables']['scribbles']['Row']
export type BoxClaimRow       = Database['public']['Tables']['box_claims']['Row']
export type NotificationRow   = Database['public']['Tables']['notifications']['Row']
export type AcademicGroupRow  = Database['public']['Tables']['academic_groups']['Row']
export type ProgramRow        = Database['public']['Tables']['programs']['Row']
export type BatchRow          = Database['public']['Tables']['batches']['Row']
export type FriendGroupRow    = Database['public']['Tables']['friend_groups']['Row']
export type ScribbleRequestRow = Database['public']['Tables']['scribble_requests']['Row']
export type ScribbleReactionRow = Database['public']['Tables']['scribble_reactions']['Row']
export type ExportRequestRow = Database['public']['Tables']['export_requests']['Row']
export type ErrorLogRow = Database['public']['Tables']['error_logs']['Row']
