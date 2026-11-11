import {NextRequest,NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/supabase-server';

export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code');
 const oauthError=req.nextUrl.searchParams.get('error');
 const login=(error:string)=>NextResponse.redirect(new URL('/login?error='+error,req.url));
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
  return NextResponse.redirect(new URL('/app',req.url));
 }catch{
  return login('oauth_exchange_failed');
 }
}
