'use client';
import {createBrowserClient} from '@supabase/ssr';
import type {Database} from './database.types';
export const configured=!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
let instance:ReturnType<typeof createBrowserClient<Database>>|null=null;
export function browserSupabase(){
 if(!configured)return null;
 if(!instance)instance=createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
 return instance;
}
