import {NextRequest,NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/supabase-server';
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code');
 if(code){const supabase=await serverSupabase();if(supabase){const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/app',req.url));}}
 return NextResponse.redirect(new URL('/login?error=auth',req.url));
}
