export interface Database {
  public: {
    Tables: {
      contents: {
        Row: {
          id: string;
          title: string;
          description: string;
          image_url: string;
          access_code: string;
          created_at: string;
          view_count: number;
          user_id: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          image_url: string;
          access_code?: string;
          created_at?: string;
          view_count?: number;
          user_id: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          image_url?: string;
          access_code?: string;
          created_at?: string;
          view_count?: number;
          user_id?: string;
        };
      };
      content_views: {
        Row: {
          id: string;
          content_id: string;
          content_user_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          content_id: string;
          content_user_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          content_id?: string;
          content_user_id?: string;
          viewed_at?: string;
        };
      };
    };
  };
} 
