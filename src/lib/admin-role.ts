/** Server-side admin membership verification. Authorization is based on
 * public.admin_users ownership, never editable user_metadata, provider, or email.
 * The frontend may display the result but cannot grant a role.
 */
export type AdminRoleResult={status:'authorized'|'not_admin'|'unavailable';message?:string};
export async function checkAdminRole(sb:any,userId:string):Promise<AdminRoleResult>{
 if(!userId)return {status:'not_admin'};
 try{
  const {data,error}=await sb.from('admin_users').select('user_id').eq('user_id',userId).maybeSingle();
  if(error){
   console.error('[admin/auth] Admin role lookup failed',{code:error.code||'unknown'});
   return {status:'unavailable',message:'Unable to check administrator access. Verify the admin_users table and its SELECT RLS policy in the ResumeBuilder Supabase project.'};
  }
  return data?.user_id===userId?{status:'authorized'}:{status:'not_admin'};
 }catch{
  return {status:'unavailable',message:'Admin role verification is temporarily unavailable.'};
 }
}
