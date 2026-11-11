import {NextRequest,NextResponse} from 'next/server';
import ExcelJS from 'exceljs';
import {adminAccess} from '@/lib/admin-access';
import {writeAudit} from '@/lib/audit';
export const runtime='nodejs';

const kinds=['activity','users','resumes','ats','jobs','usage'] as const;
type Kind=typeof kinds[number];
const clean=(v:unknown):string=>{
 const s=typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'');
 const text=s.replace(/[\u0000-\u001F]/g,' ').slice(0,4000);
 // Prevent spreadsheet formula injection in exported user-supplied fields.
 return /^[\s]*[=+\-@\t\r]/.test(text)?"'"+text:text;
};
const date=(v:unknown)=>v?new Date(String(v)).toISOString():'';
function addSheet(workbook:ExcelJS.Workbook,title:string,headers:string[],rows:unknown[][]){
 const sh=workbook.addWorksheet(title,{views:[{state:'frozen',ySplit:1}]});
 sh.addRow(headers);
 const row=sh.getRow(1);row.font={bold:true,color:{argb:'FFFFFFFF'},size:11};
 row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF5F31D8'}};
 row.height=27;row.alignment={vertical:'middle'};
 headers.forEach((h,i)=>{sh.getColumn(i+1).width=Math.min(45,Math.max(15,h.length+9));});
 for(const item of rows)sh.addRow(item.map(clean));
 if(sh.rowCount>1)sh.autoFilter={from:{row:1,column:1},to:{row:sh.rowCount,column:headers.length}};
 sh.eachRow((r,index)=>{if(index>1){r.height=20;r.alignment={vertical:'top'};if(index%2===0)r.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F3FF'}};}});
}
export async function GET(req:NextRequest){
 const role=await adminAccess();
 if('error'in role)return NextResponse.json({error:role.error},{status:role.status});
 const kind=req.nextUrl.searchParams.get('kind') as Kind;
 if(!kinds.includes(kind))return NextResponse.json({error:'Invalid export type'},{status:400});
 const period=req.nextUrl.searchParams.get('period')||'30';
 if(!['7','30','90','all'].includes(period))return NextResponse.json({error:'Invalid period'},{status:400});
 const since=period==='all'?null:new Date(Date.now()-Number(period)*86400000).toISOString();
 const db=role.admin;
 // Export first 2,000 records per table to avoid excessive memory use.
 let records:Record<string,unknown>[]=[];
 try{
  if(kind==='users'){
   const all=[];for(let p=1;p<=20;p++){const {data,error}=await db.auth.admin.listUsers({page:p,perPage:100});if(error)throw error;all.push(...data.users);if(data.users.length<100)break;}
   records=all.map(u=>({id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at}));
  } else {
   const table:Record<Exclude<Kind,'users'>,string>={activity:'activity_logs',resumes:'resumes',ats:'ats_scans',jobs:'job_posts',usage:'ai_events'};
   let q=db.from(table[kind]).select('*');
   if(since&&['activity','ats','usage'].includes(kind))q=q.gte('created_at',since);
   const {data,error}=await q.order('created_at',{ascending:false}).limit(2000);
   if(error)throw error;
   records=(data||[]) as Record<string,unknown>[];
  }
  const book=new ExcelJS.Workbook();book.creator='ResumeBuilder';book.created=new Date();
  book.properties.date1904=false;
  addSheet(book,'Export Information',['Report','Date Range','Exported At','Rows','Source'],[
   [kind,period==='all'?'All time':'Last '+period+' days',new Date().toISOString(),records.length,'ResumeBuilder Admin']
  ]);
  if(kind==='activity')addSheet(book,'Activity Logs',['Date and Time','Actor Email','Actor ID','Action','Description','IP Address','Device / Browser'],records.map(x=>[date(x.created_at),(x.details as Record<string,unknown>|null)?.actor_email||'',x.actor_id||'',x.action||'',JSON.stringify(x.details||{}),x.ip_address||'Not captured',x.user_agent||'Not captured']));
  if(kind==='users')addSheet(book,'Users',['User ID','Email','Registered','Last Sign In'],records.map(x=>[x.id,x.email,date(x.created_at),date(x.last_sign_in_at)]));
  if(kind==='resumes')addSheet(book,'Resumes',['ID','Title','Owner ID','Created','Updated'],records.map(x=>[x.id,x.title,x.user_id,date(x.created_at),date(x.updated_at)]));
  if(kind==='ats')addSheet(book,'ATS Reports',['Report ID','Owner ID','Score','Date'],records.map(x=>[x.id,x.user_id,x.score,date(x.created_at)]));
  if(kind==='jobs')addSheet(book,'Job Posts',['ID','Role','Company','Location','Employment','Status','Created'],records.map(x=>[x.id,x.role,x.company,x.location,x.type,x.is_active?'Published':'Draft',date(x.created_at)]));
  if(kind==='usage')addSheet(book,'AI Usage',['Event ID','User ID','AI Task','Created'],records.map(x=>[x.id,x.user_id,x.task,date(x.created_at)]));
  await writeAudit(db,req,role.user,'admin_excel_export',{report:kind,period,rows:records.length});
  const bytes=await book.xlsx.writeBuffer();
  const filename='resumebuilder-'+kind+'-'+new Date().toISOString().slice(0,10)+'.xlsx';
  return new NextResponse(new Uint8Array(bytes).buffer as ArrayBuffer,{headers:{
   'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   'Content-Disposition':'attachment; filename="'+filename+'"',
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
  }});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to export Excel report'},{status:500});}
}
