import type {Education} from './types';

/** Older saved resumes use only degree, school and dates.
 * Keep those keys readable while new entries gain structured school history.
 */
export const EDUCATION_LEVELS=[
 'College / University',
 'Senior High School / TVL',
 'Vocational / Technical',
 'Alternative Learning System (ALS)',
 'Secondary / Junior High School',
 'Primary / Elementary',
 'Other'
] as const;

export function newEducation(id:string):Education {
 return {id,school:'',degree:'',dates:'',level:'',program:'',address:'',startYear:'',endYear:'',isCurrent:false};
}
export function educationProgram(e:Education):string {
 return (e.program||e.degree||'').trim();
}
export function educationYears(e:Education){
 const legacy=(e.dates||'').trim();
 const match=legacy.match(/^(\d{4})\s*[–—-]\s*(\d{4}|present|current)$/i);
 const lone=legacy.match(/^\d{4}$/);
 const startYear=e.startYear||match?.[1]||(lone?legacy:'');
 const current=e.isCurrent===true||(e.isCurrent===undefined&&/present|current/i.test(match?.[2]||''));
 const endYear=e.endYear||(match&&!/present|current/i.test(match[2])?match[2]:'');
 return {startYear:startYear||'',endYear:endYear||'',isCurrent:current};
}
export function educationDates(e:Education):string {
 const {startYear,endYear,isCurrent}=educationYears(e);
 if(startYear||endYear||isCurrent){
  if(isCurrent)return [startYear,'Present'].filter(Boolean).join(' – ');
  return [startYear,endYear].filter(Boolean).join(' – ');
 }
 return (e.dates||'').trim();
}
export function updateEducation(e:Education,values:Partial<Education>):Education {
 const updated:Education={...e,...values};
 if(values.program!==undefined)updated.degree=values.program; // older fields/export consumers
 if(values.startYear!==undefined||values.endYear!==undefined||values.isCurrent!==undefined){
  const years=educationYears(updated);
  updated.startYear=years.startYear;
  updated.endYear=years.endYear;
  updated.isCurrent=years.isCurrent;
  // Keep old "dates" representation in sync as legacy fallback.
  updated.dates=educationDates(updated);
 }
 return updated;
}
function yearForSort(e:Education):number{
 const y=educationYears(e);
 if(y.isCurrent)return 9999;
 const parsed=Number(y.endYear||y.startYear);
 return parsed>=1900&&parsed<=2200?parsed:0;
}
/** Sort complete/new records by latest year, but preserve user order when
 * no recognized year was provided; avoid mutating stored input order.
 */
export function sortEducation(list:Education[]):Education[]{
 return list.map((entry,index)=>({entry,index})).sort((a,b)=>{
  const ya=yearForSort(a.entry),yb=yearForSort(b.entry);
  return yb-ya||a.index-b.index;
 }).map(x=>x.entry);
}
export function educationEntry(e:Education){
 const level=(e.level||'').trim();
 const program=educationProgram(e);
 // Keep the level visible when using TVL/ALS, even without a college degree.
 const title=[level,program].filter(Boolean).join(' — ')||e.school||'';
 const school=title===e.school?'':(e.school||'').trim();
 const subtitle=[school,educationDates(e)].filter(Boolean).join(' · ');
 const body=(e.address||'').trim();
 return {title,subtitle,body};
}
