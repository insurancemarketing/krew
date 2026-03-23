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
        Insert: Omit<Database["public"]["Tables"]["ads"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ads"]["Insert"]>;
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
        Insert: Omit<Database["public"]["Tables"]["contacts"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
      };
      pipeline_events: {
        Row: {
          id: string;
          contact_id: string;
          stage_name: string | null;
          tag_added: string | null;
          event_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pipeline_events"]["Row"], "id" | "event_at"> & {
          id?: string;
          event_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pipeline_events"]["Insert"]>;
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
        Insert: Omit<Database["public"]["Tables"]["ad_spend"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ad_spend"]["Insert"]>;
      };
      config: {
        Row: {
          id: string;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["config"]["Row"], "id" | "updated_at"> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["config"]["Insert"]>;
      };
    };
  };
}

// Convenience row types
export type Ad = Database["public"]["Tables"]["ads"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type PipelineEvent = Database["public"]["Tables"]["pipeline_events"]["Row"];
export type AdSpend = Database["public"]["Tables"]["ad_spend"]["Row"];
export type Config = Database["public"]["Tables"]["config"]["Row"];
