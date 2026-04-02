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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

// Convenience row types
export type Ad = Database["public"]["Tables"]["ads"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type PipelineEvent = Database["public"]["Tables"]["pipeline_events"]["Row"];
export type AdSpend = Database["public"]["Tables"]["ad_spend"]["Row"];
export type Config = Database["public"]["Tables"]["config"]["Row"];
export type KrewClient = Database["public"]["Tables"]["krew_clients"]["Row"];
export type KrewContact = Database["public"]["Tables"]["krew_contacts"]["Row"];
export type KrewAdSpend = Database["public"]["Tables"]["krew_ad_spend"]["Row"];
