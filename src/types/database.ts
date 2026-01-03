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
      application_emails: {
        Row: {
          id: string
          user_id: string
          application_id: string | null
          from_address: string
          from_name: string | null
          subject: string
          body_preview: string | null
          received_at: string
          classification: Database['public']['Enums']['email_classification'] | null
          classification_confidence: number | null
          is_manually_classified: boolean
          extracted_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          application_id?: string | null
          from_address: string
          from_name?: string | null
          subject: string
          body_preview?: string | null
          received_at: string
          classification?: Database['public']['Enums']['email_classification'] | null
          classification_confidence?: number | null
          is_manually_classified?: boolean
          extracted_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          application_id?: string | null
          from_address?: string
          from_name?: string | null
          subject?: string
          body_preview?: string | null
          received_at?: string
          classification?: Database['public']['Enums']['email_classification'] | null
          classification_confidence?: number | null
          is_manually_classified?: boolean
          extracted_data?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'application_emails_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'application_emails_application_id_fkey'
            columns: ['application_id']
            isOneToOne: false
            referencedRelation: 'applications'
            referencedColumns: ['id']
          }
        ]
      }
      applications: {
        Row: {
          id: string
          user_id: string
          job_title: string
          company_name: string
          job_url: string | null
          job_url_hash: string | null
          location: string | null
          location_type: Database['public']['Enums']['location_type'] | null
          salary_min: number | null
          salary_max: number | null
          salary_currency: string
          job_type: Database['public']['Enums']['job_type']
          job_description: string | null
          requirements: string[] | null
          status: Database['public']['Enums']['application_status']
          source: string
          notes: string | null
          date_saved: string
          date_applied: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_title: string
          company_name: string
          job_url?: string | null
          job_url_hash?: string | null
          location?: string | null
          location_type?: Database['public']['Enums']['location_type'] | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string
          job_type?: Database['public']['Enums']['job_type']
          job_description?: string | null
          requirements?: string[] | null
          status?: Database['public']['Enums']['application_status']
          source?: string
          notes?: string | null
          date_saved?: string
          date_applied?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_title?: string
          company_name?: string
          job_url?: string | null
          job_url_hash?: string | null
          location?: string | null
          location_type?: Database['public']['Enums']['location_type'] | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string
          job_type?: Database['public']['Enums']['job_type']
          job_description?: string | null
          requirements?: string[] | null
          status?: Database['public']['Enums']['application_status']
          source?: string
          notes?: string | null
          date_saved?: string
          date_applied?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'applications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      status_history: {
        Row: {
          id: string
          application_id: string
          from_status: Database['public']['Enums']['application_status'] | null
          to_status: Database['public']['Enums']['application_status']
          trigger_type: string
          trigger_email_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id: string
          from_status?: Database['public']['Enums']['application_status'] | null
          to_status: Database['public']['Enums']['application_status']
          trigger_type: string
          trigger_email_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          from_status?: Database['public']['Enums']['application_status'] | null
          to_status?: Database['public']['Enums']['application_status']
          trigger_type?: string
          trigger_email_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'status_history_application_id_fkey'
            columns: ['application_id']
            isOneToOne: false
            referencedRelation: 'applications'
            referencedColumns: ['id']
          }
        ]
      }
      unmatched_emails: {
        Row: {
          id: string
          user_id: string
          email_id: string
          suggested_application_ids: string[] | null
          linked_application_id: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_id: string
          suggested_application_ids?: string[] | null
          linked_application_id?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_id?: string
          suggested_application_ids?: string[] | null
          linked_application_id?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unmatched_emails_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'unmatched_emails_email_id_fkey'
            columns: ['email_id']
            isOneToOne: false
            referencedRelation: 'application_emails'
            referencedColumns: ['id']
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          inbound_email_address: string | null
          email_sync_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          inbound_email_address?: string | null
          email_sync_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          inbound_email_address?: string | null
          email_sync_enabled?: boolean
          created_at?: string
          updated_at?: string
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
      application_status:
        | 'SAVED'
        | 'APPLIED'
        | 'SCREENING'
        | 'INTERVIEWING'
        | 'OFFER'
        | 'ACCEPTED'
        | 'REJECTED'
        | 'WITHDRAWN'
        | 'GHOSTED'
      email_classification:
        | 'REJECTION'
        | 'INTERVIEW_REQUEST'
        | 'OFFER'
        | 'SCREENING_INVITE'
        | 'ASSESSMENT_REQUEST'
        | 'GENERIC_UPDATE'
        | 'UNRELATED'
      job_type: 'internship' | 'full_time' | 'part_time' | 'contract'
      location_type: 'remote' | 'hybrid' | 'onsite'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// Convenience types
export type Application = Tables<'applications'>
export type ApplicationInsert = InsertTables<'applications'>
export type ApplicationUpdate = UpdateTables<'applications'>
export type ApplicationEmail = Tables<'application_emails'>
export type ApplicationEmailInsert = InsertTables<'application_emails'>
export type UnmatchedEmail = Tables<'unmatched_emails'>
export type User = Tables<'users'>
export type StatusHistory = Tables<'status_history'>
export type ApplicationStatus = Enums<'application_status'>
export type EmailClassification = Enums<'email_classification'>
export type JobType = Enums<'job_type'>
export type LocationType = Enums<'location_type'>