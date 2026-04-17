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
      audit_events: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_definitions: {
        Row: {
          amount_minor: number | null
          charge_type: Database["public"]["Enums"]["charge_type"]
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          provider_id: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          amount_minor?: number | null
          charge_type: Database["public"]["Enums"]["charge_type"]
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          provider_id?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number | null
          charge_type?: Database["public"]["Enums"]["charge_type"]
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          provider_id?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_definitions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_definitions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_instances: {
        Row: {
          amount_minor: number
          charge_definition_id: string | null
          charge_source: Database["public"]["Enums"]["charge_source"]
          created_at: string
          currency: string
          id: string
          landlord_fixed_minor: number | null
          landlord_percentage: number | null
          name: string
          source_document_id: string | null
          split_type: Database["public"]["Enums"]["split_type"]
          statement_id: string
          tenant_fixed_minor: number | null
          tenant_percentage: number | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          charge_definition_id?: string | null
          charge_source?: Database["public"]["Enums"]["charge_source"]
          created_at?: string
          currency?: string
          id?: string
          landlord_fixed_minor?: number | null
          landlord_percentage?: number | null
          name: string
          source_document_id?: string | null
          split_type?: Database["public"]["Enums"]["split_type"]
          statement_id: string
          tenant_fixed_minor?: number | null
          tenant_percentage?: number | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          charge_definition_id?: string | null
          charge_source?: Database["public"]["Enums"]["charge_source"]
          created_at?: string
          currency?: string
          id?: string
          landlord_fixed_minor?: number | null
          landlord_percentage?: number | null
          name?: string
          source_document_id?: string | null
          split_type?: Database["public"]["Enums"]["split_type"]
          statement_id?: string
          tenant_fixed_minor?: number | null
          tenant_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_instances_charge_definition_id_fkey"
            columns: ["charge_definition_id"]
            isOneToOne: false
            referencedRelation: "charge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_instances_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_instances_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
        ]
      }
      company_cache: {
        Row: {
          activity_code: number | null
          activity_description: string | null
          city: string | null
          country_code: string
          created_at: string
          email: string | null
          fetched_at: string
          id: string
          legal_name: string | null
          phone: string | null
          source: string
          state: string | null
          tax_id: string
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          activity_code?: number | null
          activity_description?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          email?: string | null
          fetched_at?: string
          id?: string
          legal_name?: string | null
          phone?: string | null
          source: string
          state?: string | null
          tax_id: string
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          activity_code?: number | null
          activity_description?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          email?: string | null
          fetched_at?: string
          id?: string
          legal_name?: string | null
          phone?: string | null
          source?: string
          state?: string | null
          tax_id?: string
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_cache_history: {
        Row: {
          company_cache_id: string
          detected_at: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          company_cache_id: string
          detected_at?: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          company_cache_id?: string
          detected_at?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_cache_history_company_cache_id_fkey"
            columns: ["company_cache_id"]
            isOneToOne: false
            referencedRelation: "company_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          charge_instance_id: string
          created_at: string
          description: string | null
          id: string
          issue_type: string
          raised_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          charge_instance_id: string
          created_at?: string
          description?: string | null
          id?: string
          issue_type: string
          raised_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          charge_instance_id?: string
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: string
          raised_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_charge_instance_id_fkey"
            columns: ["charge_instance_id"]
            isOneToOne: false
            referencedRelation: "charge_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engineer_allowlist: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      example_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type: string
          profile_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "example_documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "provider_invoice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_call_log: {
        Row: {
          created_at: string
          duration_ms: number
          error_category: string | null
          error_message: string | null
          id: string
          operation: string
          service: string
          status_code: number | null
          success: boolean
        }
        Insert: {
          created_at?: string
          duration_ms: number
          error_category?: string | null
          error_message?: string | null
          id?: string
          operation: string
          service: string
          status_code?: number | null
          success: boolean
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error_category?: string | null
          error_message?: string | null
          id?: string
          operation?: string
          service?: string
          status_code?: number | null
          success?: boolean
        }
        Relationships: []
      }
      extraction_test_cases: {
        Row: {
          competencies_tested: string[]
          created_at: string
          created_by: string
          description: string | null
          expected_fields: Json
          id: string
          profile_id: string
          test_bill_id: string
        }
        Insert: {
          competencies_tested?: string[]
          created_at?: string
          created_by?: string
          description?: string | null
          expected_fields: Json
          id?: string
          profile_id: string
          test_bill_id: string
        }
        Update: {
          competencies_tested?: string[]
          created_at?: string
          created_by?: string
          description?: string | null
          expected_fields?: Json
          id?: string
          profile_id?: string
          test_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_test_cases_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "provider_invoice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_test_cases_test_bill_id_fkey"
            columns: ["test_bill_id"]
            isOneToOne: false
            referencedRelation: "provider_test_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_test_runs: {
        Row: {
          accuracy: number
          created_at: string
          id: string
          min_accuracy_threshold: number | null
          passed: boolean
          passed_fields: number
          profile_id: string | null
          report: Json
          total_cases: number
          total_fields: number
          triggered_by: string
        }
        Insert: {
          accuracy: number
          created_at?: string
          id?: string
          min_accuracy_threshold?: number | null
          passed: boolean
          passed_fields: number
          profile_id?: string | null
          report: Json
          total_cases: number
          total_fields: number
          triggered_by: string
        }
        Update: {
          accuracy?: number
          created_at?: string
          id?: string
          min_accuracy_threshold?: number | null
          passed?: boolean
          passed_fields?: number
          profile_id?: string | null
          report?: Json
          total_cases?: number
          total_fields?: number
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_test_runs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "provider_invoice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          code: string | null
          created_at: string
          expires_at: string | null
          id: string
          invited_by: string
          invited_email: string
          invited_name: string | null
          personal_note: string | null
          property_address_hint: string | null
          property_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          source: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_email: string
          invited_name?: string | null
          personal_note?: string | null
          property_address_hint?: string | null
          property_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
          source?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_email?: string
          invited_name?: string | null
          personal_note?: string | null
          property_address_hint?: string | null
          property_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          source?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "home_properties"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_counts"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invitations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          property_id: string
          role: Database["public"]["Enums"]["user_role"]
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          property_id: string
          role: Database["public"]["Enums"]["user_role"]
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          property_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "home_properties"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "memberships_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_counts"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_minor: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_file_path: string | null
          rejection_reason: string | null
          statement_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_file_path?: string | null
          rejection_reason?: string | null
          statement_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_file_path?: string | null
          rejection_reason?: string | null
          statement_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acquisition_channel: string | null
          analytics_opt_out: boolean
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          has_redeemed_invite: boolean
          id: string
          phone: string | null
          preferred_locale: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          acquisition_channel?: string | null
          analytics_opt_out?: boolean
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          has_redeemed_invite?: boolean
          id: string
          phone?: string | null
          preferred_locale?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_channel?: string | null
          analytics_opt_out?: boolean
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          has_redeemed_invite?: boolean
          id?: string
          phone?: string | null
          preferred_locale?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          city: string | null
          complement: string | null
          country_code: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          neighborhood: string | null
          number: string | null
          postal_code: string | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          complement?: string | null
          country_code?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          number?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          complement?: string | null
          country_code?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          number?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_invoice_profiles: {
        Row: {
          auto_accept_threshold: number
          capabilities: Json
          category: Database["public"]["Enums"]["provider_category"] | null
          created_at: string
          extraction_config: Json
          id: string
          is_active: boolean
          min_accuracy: number
          name: string
          notes: string | null
          parser_strategy: string
          provider_id: string
          region: string | null
          review_threshold: number
          status: Database["public"]["Enums"]["provider_profile_status"]
          updated_at: string
          validation_config: Json
          version: number
        }
        Insert: {
          auto_accept_threshold?: number
          capabilities?: Json
          category?: Database["public"]["Enums"]["provider_category"] | null
          created_at?: string
          extraction_config?: Json
          id?: string
          is_active?: boolean
          min_accuracy?: number
          name: string
          notes?: string | null
          parser_strategy: string
          provider_id: string
          region?: string | null
          review_threshold?: number
          status?: Database["public"]["Enums"]["provider_profile_status"]
          updated_at?: string
          validation_config?: Json
          version?: number
        }
        Update: {
          auto_accept_threshold?: number
          capabilities?: Json
          category?: Database["public"]["Enums"]["provider_category"] | null
          created_at?: string
          extraction_config?: Json
          id?: string
          is_active?: boolean
          min_accuracy?: number
          name?: string
          notes?: string | null
          parser_strategy?: string
          provider_id?: string
          region?: string | null
          review_threshold?: number
          status?: Database["public"]["Enums"]["provider_profile_status"]
          updated_at?: string
          validation_config?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_invoice_profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_test_bills: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string
          profile_id: string | null
          provider_id: string | null
          source: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string
          profile_id?: string | null
          provider_id?: string | null
          source: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string
          profile_id?: string | null
          provider_id?: string | null
          source?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_test_bills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "provider_invoice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_test_bills_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_threshold_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_value: number
          old_value: number | null
          profile_id: string
          reason: string | null
          threshold_type: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value: number
          old_value?: number | null
          profile_id: string
          reason?: string | null
          threshold_type: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: number
          old_value?: number | null
          profile_id?: string
          reason?: string | null
          threshold_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_threshold_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "provider_invoice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          company_cache_id: string | null
          country_code: string
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_cache_id?: string | null
          country_code?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_cache_id?: string | null
          country_code?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_company_cache_id_fkey"
            columns: ["company_cache_id"]
            isOneToOne: false
            referencedRelation: "company_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          charge_definition_id: string
          created_at: string
          day_of_month: number
          end_date: string | null
          id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          charge_definition_id: string
          created_at?: string
          day_of_month?: number
          end_date?: string | null
          id?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          charge_definition_id?: string
          created_at?: string
          day_of_month?: number
          end_date?: string | null
          id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_charge_definition_id_fkey"
            columns: ["charge_definition_id"]
            isOneToOne: false
            referencedRelation: "charge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      responsibility_allocations: {
        Row: {
          allocation_type: Database["public"]["Enums"]["split_type"]
          charge_definition_id: string
          created_at: string
          fixed_minor: number | null
          id: string
          percentage: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          allocation_type?: Database["public"]["Enums"]["split_type"]
          charge_definition_id: string
          created_at?: string
          fixed_minor?: number | null
          id?: string
          percentage?: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          allocation_type?: Database["public"]["Enums"]["split_type"]
          charge_definition_id?: string
          created_at?: string
          fixed_minor?: number | null
          id?: string
          percentage?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsibility_allocations_charge_definition_id_fkey"
            columns: ["charge_definition_id"]
            isOneToOne: false
            referencedRelation: "charge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      source_documents: {
        Row: {
          created_at: string
          failure_category: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          ingestion_status: Database["public"]["Enums"]["ingestion_status"]
          mime_type: string
          period_month: number | null
          period_year: number | null
          profile_id: string | null
          unit_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          failure_category?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          ingestion_status?: Database["public"]["Enums"]["ingestion_status"]
          mime_type: string
          period_month?: number | null
          period_year?: number | null
          profile_id?: string | null
          unit_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          failure_category?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          ingestion_status?: Database["public"]["Enums"]["ingestion_status"]
          mime_type?: string
          period_month?: number | null
          period_year?: number | null
          profile_id?: string | null
          unit_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "provider_invoice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      statements: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          id: string
          landlord_total_minor: number
          period_month: number
          period_year: number
          previous_version_id: string | null
          published_at: string | null
          revision: number
          revision_note: string | null
          status: Database["public"]["Enums"]["statement_status"]
          tenant_total_minor: number
          total_amount_minor: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          id?: string
          landlord_total_minor?: number
          period_month: number
          period_year: number
          previous_version_id?: string | null
          published_at?: string | null
          revision?: number
          revision_note?: string | null
          status?: Database["public"]["Enums"]["statement_status"]
          tenant_total_minor?: number
          total_amount_minor?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          landlord_total_minor?: number
          period_month?: number
          period_year?: number
          previous_version_id?: string | null
          published_at?: string | null
          revision?: number
          revision_note?: string | null
          status?: Database["public"]["Enums"]["statement_status"]
          tenant_total_minor?: number
          total_amount_minor?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "statements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_splits: {
        Row: {
          charge_instance_id: string
          created_at: string
          id: string
          percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          charge_instance_id: string
          created_at?: string
          id?: string
          percentage: number
          updated_at?: string
          user_id: string
        }
        Update: {
          charge_instance_id?: string
          created_at?: string
          id?: string
          percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_splits_charge_instance_id_fkey"
            columns: ["charge_instance_id"]
            isOneToOne: false
            referencedRelation: "charge_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          due_day_of_month: number
          id: string
          name: string
          pix_key: string | null
          pix_key_type: Database["public"]["Enums"]["pix_key_type"] | null
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          due_day_of_month?: number
          id?: string
          name: string
          pix_key?: string | null
          pix_key_type?: Database["public"]["Enums"]["pix_key_type"] | null
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          due_day_of_month?: number
          id?: string
          name?: string
          pix_key?: string | null
          pix_key_type?: Database["public"]["Enums"]["pix_key_type"] | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "home_properties"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_counts"
            referencedColumns: ["property_id"]
          },
        ]
      }
    }
    Views: {
      home_action_items: {
        Row: {
          action_type: string | null
          detail_date: string | null
          detail_email: string | null
          detail_id: string | null
          detail_name: string | null
          property_id: string | null
          property_name: string | null
        }
        Relationships: []
      }
      home_properties: {
        Row: {
          charge_count: number | null
          city: string | null
          name: string | null
          pending_invite_count: number | null
          property_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          state: string | null
          tenant_count: number | null
          unit_count: number | null
        }
        Relationships: []
      }
      property_counts: {
        Row: {
          charge_count: number | null
          pending_invite_count: number | null
          property_id: string | null
          tenant_count: number | null
          unit_count: number | null
        }
        Insert: {
          charge_count?: never
          pending_invite_count?: never
          property_id?: string | null
          tenant_count?: never
          unit_count?: never
        }
        Update: {
          charge_count?: never
          pending_invite_count?: never
          property_id?: string | null
          tenant_count?: never
          unit_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      create_property_with_membership: {
        Args: {
          p_city?: string
          p_complement?: string
          p_country_code?: string
          p_due_day?: number
          p_name: string
          p_neighborhood?: string
          p_number?: string
          p_postal_code?: string
          p_state?: string
          p_street?: string
        }
        Returns: Json
      }
      create_property_with_unit: {
        Args: {
          p_city?: string
          p_complement?: string
          p_country_code?: string
          p_name: string
          p_neighborhood?: string
          p_number?: string
          p_postal_code?: string
          p_state?: string
          p_street?: string
        }
        Returns: Json
      }
      create_provider_with_bill: {
        Args: {
          p_bill_file_name?: string
          p_bill_storage_path?: string
          p_bill_uploaded_by?: string
          p_company_cache_id?: string
          p_country_code?: string
          p_display_name?: string
          p_email?: string
          p_name: string
          p_phone?: string
          p_tax_id?: string
          p_website?: string
        }
        Returns: string
      }
      delete_provider_cascade: {
        Args: { p_provider_id: string }
        Returns: string[]
      }
      is_property_landlord: { Args: { prop_id: string }; Returns: boolean }
      is_property_member: { Args: { prop_id: string }; Returns: boolean }
      is_unit_member: { Args: { p_unit_id: string }; Returns: boolean }
      replace_allocations: {
        Args: { p_allocations: Json; p_charge_definition_id: string }
        Returns: undefined
      }
      validate_invite_code: { Args: { invite_code: string }; Returns: boolean }
      validate_invite_with_context: {
        Args: { invite_code: string }
        Returns: {
          code: string
          invited_email: string
          invited_name: string
          is_expired: boolean
          property_name: string
        }[]
      }
    }
    Enums: {
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "publish"
        | "revise"
        | "confirm"
        | "reject"
      charge_source: "manual" | "imported" | "corrected"
      charge_type: "rent" | "recurring" | "variable"
      dispute_status: "open" | "resolved"
      ingestion_status:
        | "uploaded"
        | "processing"
        | "ready_for_review"
        | "approved"
        | "failed"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      payment_method: "pix" | "bank_transfer" | "cash" | "other"
      payment_status: "pending" | "confirmed" | "rejected"
      pix_key_type: "cpf" | "email" | "phone" | "random"
      property_type: "apartment" | "house" | "commercial" | "other"
      provider_category:
        | "electricity"
        | "water"
        | "gas"
        | "internet"
        | "condo"
        | "sewer"
        | "insurance"
        | "other"
      provider_profile_status: "draft" | "active" | "deprecated"
      split_type: "percentage" | "fixed_amount"
      statement_status: "draft" | "published"
      user_role: "landlord" | "tenant"
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
    Enums: {
      audit_action: [
        "create",
        "update",
        "delete",
        "publish",
        "revise",
        "confirm",
        "reject",
      ],
      charge_source: ["manual", "imported", "corrected"],
      charge_type: ["rent", "recurring", "variable"],
      dispute_status: ["open", "resolved"],
      ingestion_status: [
        "uploaded",
        "processing",
        "ready_for_review",
        "approved",
        "failed",
      ],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      payment_method: ["pix", "bank_transfer", "cash", "other"],
      payment_status: ["pending", "confirmed", "rejected"],
      pix_key_type: ["cpf", "email", "phone", "random"],
      property_type: ["apartment", "house", "commercial", "other"],
      provider_category: [
        "electricity",
        "water",
        "gas",
        "internet",
        "condo",
        "sewer",
        "insurance",
        "other",
      ],
      provider_profile_status: ["draft", "active", "deprecated"],
      split_type: ["percentage", "fixed_amount"],
      statement_status: ["draft", "published"],
      user_role: ["landlord", "tenant"],
    },
  },
} as const

