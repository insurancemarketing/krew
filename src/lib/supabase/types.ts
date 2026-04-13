export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      ads: {
        Row: {
          id: string;
          name: string;
          campaign_id: string | null;
          ad_set_id: string | null;
          creative_id: string | null;
          fb_ad_id: string;
          status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          campaign_id?: string | null;
          ad_set_id?: string | null;
          creative_id?: string | null;
          fb_ad_id: string;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          campaign_id?: string | null;
          ad_set_id?: string | null;
          creative_id?: string | null;
          fb_ad_id?: string;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          ghl_contact_id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          fb_click_id: string | null;
          fb_ad_id: string | null;
          pipeline_stage: string | null;
          tags: string[] | null;
          hired_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ghl_contact_id: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          fb_click_id?: string | null;
          fb_ad_id?: string | null;
          pipeline_stage?: string | null;
          tags?: string[] | null;
          hired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ghl_contact_id?: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          fb_click_id?: string | null;
          fb_ad_id?: string | null;
          pipeline_stage?: string | null;
          tags?: string[] | null;
          hired_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pipeline_events: {
        Row: {
          id: string;
          contact_id: string;
          stage_name: string | null;
          tag_added: string | null;
          event_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          stage_name?: string | null;
          tag_added?: string | null;
          event_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          stage_name?: string | null;
          tag_added?: string | null;
          event_at?: string;
        };
        Relationships: [];
      };
      ad_spend: {
        Row: {
          id: string;
          fb_ad_id: string;
          ad_id: string | null;
          date: string;
          spend: number | null;
          impressions: number | null;
          clicks: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fb_ad_id: string;
          ad_id?: string | null;
          date: string;
          spend?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fb_ad_id?: string;
          ad_id?: string | null;
          date?: string;
          spend?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      config: {
        Row: {
          id: string;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      krew_clients: {
        Row: {
          id: string;
          name: string;
          ghl_api_key: string | null;
          ghl_location_id: string | null;
          hired_tag: string | null;
          payout_per_hire: number | null;
          fb_spend_manual: boolean | null;
          client_type: string | null;
          last_synced: string | null;
          sync_status: string | null;
          sync_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          ghl_api_key?: string | null;
          ghl_location_id?: string | null;
          hired_tag?: string | null;
          payout_per_hire?: number | null;
          fb_spend_manual?: boolean | null;
          client_type?: string | null;
          last_synced?: string | null;
          sync_status?: string | null;
          sync_error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          ghl_api_key?: string | null;
          ghl_location_id?: string | null;
          hired_tag?: string | null;
          payout_per_hire?: number | null;
          fb_spend_manual?: boolean | null;
          client_type?: string | null;
          last_synced?: string | null;
          sync_status?: string | null;
          sync_error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      krew_contacts: {
        Row: {
          id: string;
          client_id: string;
          ghl_contact_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          utm_content: string | null;
          utm_campaign: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          fbclid: string | null;
          tags: string | null;
          is_hired: boolean;
          hired_at: string | null;
          watch_pct: number | null;
          created_at: string;
          last_synced: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          ghl_contact_id: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          utm_content?: string | null;
          utm_campaign?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          fbclid?: string | null;
          tags?: string | null;
          is_hired?: boolean;
          hired_at?: string | null;
          watch_pct?: number | null;
          created_at?: string;
          last_synced?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          ghl_contact_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          utm_content?: string | null;
          utm_campaign?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          fbclid?: string | null;
          tags?: string | null;
          is_hired?: boolean;
          hired_at?: string | null;
          watch_pct?: number | null;
          created_at?: string;
          last_synced?: string | null;
        };
        Relationships: [];
      };
      krew_ad_spend: {
        Row: {
          id: string;
          client_id: string;
          utm_content: string;
          ad_name: string | null;
          spend: number;
          week_starting: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          utm_content: string;
          ad_name?: string | null;
          spend: number;
          week_starting: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          utm_content?: string;
          ad_name?: string | null;
          spend?: number;
          week_starting?: string;
        };
        Relationships: [];
      };
      client_contracts: {
        Row: {
          id: string;
          client_id: string;
          client_type: string;
          monthly_retainer: number;
          performance_fee_type: string | null;
          performance_fee_amount: number;
          contract_start: string | null;
          contract_renewal: string | null;
          ad_budget_monthly: number;
          hours_per_month_estimate: number;
          target_hourly_rate: number;
          cac: number;
          status: string;
          churn_risk_score: number;
          churn_risk_color: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          client_type?: string;
          monthly_retainer?: number;
          performance_fee_type?: string | null;
          performance_fee_amount?: number;
          contract_start?: string | null;
          contract_renewal?: string | null;
          ad_budget_monthly?: number;
          hours_per_month_estimate?: number;
          target_hourly_rate?: number;
          cac?: number;
          status?: string;
          churn_risk_score?: number;
          churn_risk_color?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          client_type?: string;
          monthly_retainer?: number;
          performance_fee_type?: string | null;
          performance_fee_amount?: number;
          contract_start?: string | null;
          contract_renewal?: string | null;
          ad_budget_monthly?: number;
          hours_per_month_estimate?: number;
          target_hourly_rate?: number;
          cac?: number;
          status?: string;
          churn_risk_score?: number;
          churn_risk_color?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      monthly_performance: {
        Row: {
          id: string;
          client_id: string;
          month: string;
          ad_spend: number;
          leads: number;
          appointments_set: number;
          appointments_showed: number;
          policies_sold: number;
          premium_written: number;
          avg_policy_value: number;
          policies_cancelled: number;
          active_policies: number;
          hires: number;
          active_agents: number;
          agents_churned: number;
          cost_per_lead: number | null;
          cost_per_appointment: number | null;
          cost_per_policy: number | null;
          show_rate: number | null;
          close_rate: number | null;
          persistency_rate: number | null;
          roas: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          month: string;
          ad_spend?: number;
          leads?: number;
          appointments_set?: number;
          appointments_showed?: number;
          policies_sold?: number;
          premium_written?: number;
          avg_policy_value?: number;
          policies_cancelled?: number;
          active_policies?: number;
          hires?: number;
          active_agents?: number;
          agents_churned?: number;
          cost_per_lead?: number | null;
          cost_per_appointment?: number | null;
          cost_per_policy?: number | null;
          show_rate?: number | null;
          close_rate?: number | null;
          persistency_rate?: number | null;
          roas?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          month?: string;
          ad_spend?: number;
          leads?: number;
          appointments_set?: number;
          appointments_showed?: number;
          policies_sold?: number;
          premium_written?: number;
          avg_policy_value?: number;
          policies_cancelled?: number;
          active_policies?: number;
          hires?: number;
          active_agents?: number;
          agents_churned?: number;
          cost_per_lead?: number | null;
          cost_per_appointment?: number | null;
          cost_per_policy?: number | null;
          show_rate?: number | null;
          close_rate?: number | null;
          persistency_rate?: number | null;
          roas?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agent_tracking: {
        Row: {
          id: string;
          client_id: string;
          contact_id: string | null;
          hire_date: string | null;
          status: string;
          churned_date: string | null;
          policies_sold_30d: number;
          policies_sold_60d: number;
          policies_sold_90d: number;
          premium_30d: number;
          premium_60d: number;
          premium_90d: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          contact_id?: string | null;
          hire_date?: string | null;
          status?: string;
          churned_date?: string | null;
          policies_sold_30d?: number;
          policies_sold_60d?: number;
          policies_sold_90d?: number;
          premium_30d?: number;
          premium_60d?: number;
          premium_90d?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          contact_id?: string | null;
          hire_date?: string | null;
          status?: string;
          churned_date?: string | null;
          policies_sold_30d?: number;
          policies_sold_60d?: number;
          policies_sold_90d?: number;
          premium_30d?: number;
          premium_60d?: number;
          premium_90d?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      hours_log: {
        Row: {
          id: string;
          client_id: string;
          log_date: string;
          hours: number;
          task_description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          log_date: string;
          hours: number;
          task_description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          log_date?: string;
          hours?: number;
          task_description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      split_tests: {
        Row: {
          id: string;
          client_id: string;
          test_name: string;
          element_tested: string | null;
          control_rate: number | null;
          variation_rate: number | null;
          start_date: string | null;
          end_date: string | null;
          winner: string | null;
          implemented: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          test_name: string;
          element_tested?: string | null;
          control_rate?: number | null;
          variation_rate?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          winner?: string | null;
          implemented?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          test_name?: string;
          element_tested?: string | null;
          control_rate?: number | null;
          variation_rate?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          winner?: string | null;
          implemented?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      creative_library: {
        Row: {
          id: string;
          client_id: string;
          ad_name: string;
          utm_content: string | null;
          creative_type: string | null;
          concept_name: string | null;
          hook_summary: string | null;
          thumbnail_url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          ad_name: string;
          utm_content?: string | null;
          creative_type?: string | null;
          concept_name?: string | null;
          hook_summary?: string | null;
          thumbnail_url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          ad_name?: string;
          utm_content?: string | null;
          creative_type?: string | null;
          concept_name?: string | null;
          hook_summary?: string | null;
          thumbnail_url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      client_touchpoints: {
        Row: {
          id: string;
          client_id: string;
          touchpoint_date: string;
          type: string;
          notes: string | null;
          action_items: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          touchpoint_date: string;
          type: string;
          notes?: string | null;
          action_items?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          touchpoint_date?: string;
          type?: string;
          notes?: string | null;
          action_items?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lead_quality_by_ad: {
        Row: {
          id: string;
          client_id: string;
          utm_content: string;
          month: string;
          leads: number;
          booked: number;
          showed: number;
          closed: number;
          policies_sold: number;
          book_rate: number | null;
          show_rate: number | null;
          close_rate: number | null;
          policy_rate: number | null;
          quality_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          utm_content: string;
          month: string;
          leads?: number;
          booked?: number;
          showed?: number;
          closed?: number;
          policies_sold?: number;
          book_rate?: number | null;
          show_rate?: number | null;
          close_rate?: number | null;
          policy_rate?: number | null;
          quality_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          utm_content?: string;
          month?: string;
          leads?: number;
          booked?: number;
          showed?: number;
          closed?: number;
          policies_sold?: number;
          book_rate?: number | null;
          show_rate?: number | null;
          close_rate?: number | null;
          policy_rate?: number | null;
          quality_score?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

// Convenience row types — existing
export type Ad = Database["public"]["Tables"]["ads"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type PipelineEvent = Database["public"]["Tables"]["pipeline_events"]["Row"];
export type AdSpend = Database["public"]["Tables"]["ad_spend"]["Row"];
export type Config = Database["public"]["Tables"]["config"]["Row"];
export type KrewClient = Database["public"]["Tables"]["krew_clients"]["Row"];
export type KrewContact = Database["public"]["Tables"]["krew_contacts"]["Row"];
export type KrewAdSpend = Database["public"]["Tables"]["krew_ad_spend"]["Row"];

// New table row types
export type ClientContract = Database["public"]["Tables"]["client_contracts"]["Row"];
export type MonthlyPerformance = Database["public"]["Tables"]["monthly_performance"]["Row"];
export type AgentTracking = Database["public"]["Tables"]["agent_tracking"]["Row"];
export type HoursLog = Database["public"]["Tables"]["hours_log"]["Row"];
export type SplitTest = Database["public"]["Tables"]["split_tests"]["Row"];
export type CreativeLibrary = Database["public"]["Tables"]["creative_library"]["Row"];
export type ClientTouchpoint = Database["public"]["Tables"]["client_touchpoints"]["Row"];
export type LeadQualityByAd = Database["public"]["Tables"]["lead_quality_by_ad"]["Row"];
