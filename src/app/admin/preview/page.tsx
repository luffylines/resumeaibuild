import {redirect} from 'next/navigation';
import AdminPanel from '@/components/admin-panel';
import {serverSupabase} from '@/lib/supabase-server';
export const metadata={title:'Admin Preview | ResumeBuilder'};
export default async function AdminPreview(){
 // Preview is public SAMPLE DATA only and never renders live account content.
 if(await serverSupabase())redirect('/admin/login');
 return <AdminPanel demo/>;
}
