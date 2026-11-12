'use client';
import {GraduationCap,Plus,Trash2,Info,CalendarDays,MapPin,Check} from 'lucide-react';
import type {Education} from '@/lib/types';
import {uid} from '@/lib/types';
import {EDUCATION_LEVELS,educationYears,newEducation,updateEducation} from '@/lib/education';

type Props={education:Education[];onChange:(education:Education[])=>void};
export default function EducationEditor({education,onChange}:Props){
 const items=education||[];
 const update=(id:string,values:Partial<Education>)=>onChange(items.map(e=>e.id===id?updateEducation(e,values):e));
 return <div className="wizard-education-editor">
  <div className="wizard-education-intro"><GraduationCap size={20}/><p>Add your complete educational background, including TVL, vocational, ALS, high school or elementary education. School addresses and programs are optional.</p></div>
  {items.map((entry,index)=>{
   const years=educationYears(entry);
   const program=entry.program??entry.degree??'';
   const isOther=!!entry.level&&!EDUCATION_LEVELS.includes(entry.level as typeof EDUCATION_LEVELS[number]);
   const startNum=Number(years.startYear),endNum=Number(years.endYear);
   const invalidYears=years.startYear.length===4&&years.endYear.length===4&&!years.isCurrent&&endNum<startNum;
   return <section className="wizard-education-entry wizard-repeat" key={entry.id} aria-label={'Education '+(index+1)}>
    <div className="wizard-repeat-head">
     <span className="wizard-education-entry-label"><GraduationCap size={16}/> Education {index+1}</span>
     <button type="button" className="wizard-education-remove" aria-label={'Remove education '+(index+1)} title="Remove this education" onClick={()=>onChange(items.filter(x=>x.id!==entry.id))}><Trash2 size={17}/></button>
    </div>
    <div className="wizard-grid wizard-education-grid">
     <label className="wizard-field wizard-full"><span>Education Level</span><select value={isOther?'Other':entry.level||''} onChange={e=>update(entry.id,{level:e.target.value})}>
      <option value="">Select education level</option>
      {EDUCATION_LEVELS.map(level=><option key={level} value={level}>{level}</option>)}
     </select></label>
     {(entry.level==='Other'||isOther)&&<label className="wizard-field wizard-full"><span>Specify Education Level</span><input value={isOther?entry.level:entry.level==='Other'?'':entry.level||''} onChange={e=>update(entry.id,{level:e.target.value||'Other'})} placeholder="e.g. Postgraduate, Training Program"/></label>}
     <label className="wizard-field"><span>School / Institution</span><input value={entry.school} onChange={e=>update(entry.id,{school:e.target.value})} placeholder="e.g. Ernesto Rondon High School" autoComplete="organization"/></label>
     <label className="wizard-field"><span>Program / Strand / Course (Optional)</span><input value={program} onChange={e=>update(entry.id,{program:e.target.value})} placeholder="e.g. TVL – Information and Communications Technology"/></label>
     <label className="wizard-field"><span>Start Year</span><input value={years.startYear} onChange={e=>update(entry.id,{startYear:e.target.value.replace(/\D/g,'').slice(0,4)})} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 2023" aria-label={'Education '+(index+1)+' start year'}/></label>
     <label className="wizard-field"><span>End Year</span><input value={years.isCurrent?'':years.endYear} onChange={e=>update(entry.id,{endYear:e.target.value.replace(/\D/g,'').slice(0,4)})} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder={years.isCurrent?'Present':'e.g. 2025'} disabled={years.isCurrent} aria-label={'Education '+(index+1)+' end year'}/></label>
     <div className="wizard-field wizard-full"><span>Education Status</span><div className="wizard-education-status" role="group" aria-label={'Education '+(index+1)+' status'}>
      <button type="button" className={!years.isCurrent?'selected':''} aria-pressed={!years.isCurrent} onClick={()=>update(entry.id,{isCurrent:false})}><Check size={14}/> Completed</button>
      <button type="button" className={years.isCurrent?'selected':''} aria-pressed={years.isCurrent} onClick={()=>update(entry.id,{isCurrent:true})}><CalendarDays size={14}/> Present / Ongoing</button>
     </div></div>
     {invalidYears&&<p className="wizard-education-warning wizard-full" role="alert">The end year must not be earlier than the start year.</p>}
     <label className="wizard-field wizard-full"><span><MapPin size={13}/> School Address (Optional)</span><textarea rows={2} value={entry.address||''} onChange={e=>update(entry.id,{address:e.target.value})} placeholder="e.g. 146 Rd 3, Project 6, Quezon City, Metro Manila"/></label>
     {entry.dates&&!/^\d{4}(\s*[–—-]\s*(\d{4}|present|current))?$/i.test(entry.dates.trim())&&!entry.startYear&&!entry.endYear&&<div className="wizard-education-legacy wizard-full"><Info size={15}/> Existing date entry: {entry.dates}. Enter start/end years above to update it.</div>}
    </div>
   </section>;
  })}
  <button type="button" className="wizard-add wizard-education-add" onClick={()=>onChange([...items,newEducation(uid())])}><Plus size={17}/> Add Another Education</button>
  <p className="wizard-education-footer"><Info size={15}/> Education entries appear newest first in the resume preview and all downloaded formats. Your changes are saved with the resume draft.</p>
 </div>;
}
