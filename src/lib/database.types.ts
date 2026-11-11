// Local schema types for the dedicated ResumeBuilder Supabase project.
export type Database = {
 public: {
  Tables: {
   resumes: {
    Row: {id:string;user_id:string;title:string;content:any;created_at:string;updated_at:string};
    Insert: {id:string;user_id:string;title?:string;content?:any;created_at?:string;updated_at?:string};
    Update: {id?:string;user_id?:string;title?:string;content?:any;created_at?:string;updated_at?:string};
    Relationships: [];
   };
   job_applications: {
    Row: {id:string;user_id:string;content:any;created_at:string};
    Insert: {id:string;user_id:string;content?:any;created_at?:string};
    Update: {id?:string;user_id?:string;content?:any;created_at?:string};
    Relationships: [];
   };
  };
  Views: {};
  Functions: {};
  Enums: {};
  CompositeTypes: {};
 };
};
