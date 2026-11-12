import {NextRequest,NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/supabase-server';
import {checkAdminRole} from '@/lib/admin-role';

export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code');
 const oauthError=req.nextUrl.searchParams.get('error');
 const adminRequested=req.nextUrl.searchParams.get('next')==='admin';
 const login=(error:string)=>NextResponse.redirect(new URL((adminRequested?'/admin/login':'/login')+'?error='+encodeURIComponent(error),req.url));
 if(oauthError){
  return login(oauthError==='access_denied'?'oauth_denied':'oauth_provider');
 }
 if(!code)return login('auth');
 try{
  const supabase=await serverSupabase();
  if(!supabase)return login('auth');
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(error){
   // Only log the code and status, not access tokens, session codes or secrets.
   console.error('[auth/callback] Supabase session exchange failed',{code:error.code,status:error.status});
   return login('oauth_exchange_failed');
  }
  if(adminRequested){
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(userError||!user)return login('oauth_exchange_failed');
   const role=await checkAdminRole(supabase,user.id);
   if(role.status==='unavailable')return login('admin_role_unavailable');
   if(role.status==='not_admin')return login('not_admin');
   return NextResponse.redirect(new URL('/admin',req.url));
  }
  return NextResponse.redirect(new URL('/app',req.url));
 }catch{
  return login('oauth_exchange_failed');
 }
}
