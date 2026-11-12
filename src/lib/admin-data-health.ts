/** Safe, user-facing diagnostics for read-only admin database sections.
 * Never return database credentials or raw PostgREST error details to clients.
 */
export type AdminDataResource='auth_users'|'resumes'|'ats_scans'|'profiles'|'activity_logs'|'ai_events';
export type AdminDataWarning={resource:AdminDataResource;message:string;code:string};
export function adminDataWarning(resource:AdminDataResource,error:{code?:string;message?:string}|null|undefined):AdminDataWarning|null{
 if(!error)return null;
 const code=error.code||'UNKNOWN';
 const table=resource==='auth_users'?'Supabase Auth users':resource;
 const missing=['42P01','PGRST205','PGRST116'].includes(code)||/could not find the table|relation .* does not exist/i.test(error.message||'');
 const forbidden=['42501','PGRST301'].includes(code)||/permission denied|not authorized/i.test(error.message||'');
 const detail=missing?'Table is missing or not exposed in the Data API. Apply the ResumeBuilder schema to the correct Supabase project.'
 :forbidden?'Read access denied. Verify the server-only Supabase key and RLS policies in the dedicated ResumeBuilder project.'
 :'Unable to fetch records. Check the dedicated ResumeBuilder Supabase project and server logs.';
 return {resource,code,message:table+': '+detail};
}
export function adminEmptyData(){
 return {
  users:[],userTotal:0,resumes:[],resumeCount:0,ats:[],atsCount:0,activities:[],
  activityCount:0,aiEvents:[],aiCount:0,plans:{free:0,pro:0,team:0},
  limitedUsers:false,warnings:[] as AdminDataWarning[]
 };
}
