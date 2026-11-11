import {NextRequest,NextResponse} from 'next/server';
import {adminAccess} from '@/lib/admin-access';
import {writeAudit} from '@/lib/audit';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 const access=await adminAccess();
 if('error'in access)return NextResponse.json({error:access.error},{status:access.status});
 const saved=await writeAudit(access.admin,req,access.user,'admin_login',{route:'/admin/login'});
 return NextResponse.json({ok:saved},{headers:{'Cache-Control':'no-store'}});
}
