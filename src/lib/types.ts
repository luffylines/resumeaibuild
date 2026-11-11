import type {ResumeTemplateId} from './templates';
export type Experience = { id:string; role:string; company:string; dates:string; details:string };
export type Education = { id:string; school:string; degree:string; dates:string };
export type Resume = { id:string; title:string; name:string; email:string; phone:string; location:string; portfolio:string; targetRole:string; summary:string; skills:string; experience:Experience[]; education:Education[]; updatedAt:string; photo?:string|null; accentColor?:string; backgroundColor?:string; template?:ResumeTemplateId };
export type ApplicationStatus = 'Applied'|'Interview'|'Offer'|'Rejected';
export type JobApplication = {id:string;company:string;role:string;status:ApplicationStatus;link:string;appliedAt:string};
export type SampleJob = {id:string;role:string;company:string;location:string;type:string;keywords:string[]};
export const uid = () => crypto.randomUUID();
export const emptyResume = ():Resume => ({id:uid(),title:'Untitled Resume',name:'',email:'',phone:'',location:'',portfolio:'',targetRole:'',summary:'',skills:'',experience:[{id:uid(),role:'',company:'',dates:'',details:''}],education:[{id:uid(),school:'',degree:'',dates:''}],updatedAt:new Date().toISOString()});
export const sampleResume:Resume = {id:'f36c6346-dab1-452e-9baa-88da256f9881',title:'Senior UX Designer',name:'Christian B. Aring',email:'demo@example.com',phone:'+63 900 000 0000',location:'Quezon City, Philippines',portfolio:'portfolio.example',targetRole:'Senior Product Designer',summary:'Product designer with 5+ years of experience designing accessible digital products, running user research, and collaborating with engineers to improve user experiences.',skills:'Figma, UX Research, Design Systems, UI Design, Prototyping, User Testing, Accessibility',experience:[{id:'e1',role:'Product Designer',company:'Northstar Studio',dates:'2022 – Present',details:'Led mobile and web redesign projects and worked closely with engineering teams to deliver clear, accessible user interfaces.'}],education:[{id:'ed1',school:'State University',degree:'B.S. Digital Design',dates:'2016 – 2020'}],updatedAt:'2026-11-11T00:00:00.000Z'};

export const sampleResumes:Resume[]=[
 sampleResume,
 {...sampleResume,id:'83270ace-d632-424b-a83e-9cfd70102a8b',title:'Frontend Developer',targetRole:'Frontend Developer',skills:'React, TypeScript, JavaScript, HTML, CSS, Git, Accessibility',summary:'Frontend developer with practical experience in web interfaces, reusable components, accessibility, and responsive layouts.',template:'professional'},
 {...sampleResume,id:'9151d65f-a38f-4d12-bd49-3f9222f574e4',title:'Product Designer',targetRole:'Product Designer',template:'minimal'},
 {...sampleResume,id:'da9aa012-1a0b-42a3-bbd5-aa441782cf99',title:'Marketing Specialist',targetRole:'Marketing Specialist',skills:'Communication, Analytics, Content Strategy, Campaign Management, Research',template:'modern'}
];

export const sampleJobs:SampleJob[] = [
{id:'1',role:'Senior Product Designer',company:'Northwind Digital',location:'Remote',type:'Full-time',keywords:['figma','ux research','design systems','prototyping']},
{id:'2',role:'UI/UX Designer',company:'Lumina Studio',location:'Manila · Hybrid',type:'Full-time',keywords:['ui design','figma','accessibility','user testing']},
{id:'3',role:'Frontend Developer',company:'Orbit Labs',location:'Asia · Remote',type:'Contract',keywords:['react','typescript','css','javascript']},
{id:'4',role:'Data Analyst',company:'Insight Works',location:'Quezon City · Hybrid',type:'Full-time',keywords:['sql','excel','python','analytics']},
{id:'5',role:'Product Manager',company:'Bluepeak',location:'Makati · On-site',type:'Full-time',keywords:['product strategy','analytics','stakeholders','roadmaps']}
];
