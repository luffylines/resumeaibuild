export const RESUME_TEMPLATES = [
 {id:'modern',name:'Modern Violet',category:'Modern',layout:'single',accent:'#6736ec',ink:'#211b3d',tag:'Popular',audience:'IT, office and corporate roles',description:'Modern purple headings, slim accent rule and clean content.'},
 {id:'modern-blue',name:'Modern Blue',category:'Modern',layout:'single',accent:'#2563eb',ink:'#1c3554',tag:'ATS-friendly',audience:'Software and engineering',description:'Clear blue hierarchy and recruiter-friendly spacing.'},
 {id:'modern-teal',name:'Modern Teal',category:'Modern',layout:'single',accent:'#078e84',ink:'#183f41',tag:'ATS-friendly',audience:'Healthcare and business',description:'Refined teal accents with compact, readable sections.'},
 {id:'modern-coral',name:'Modern Coral',category:'Modern',layout:'single',accent:'#d65e64',ink:'#473039',tag:'Modern',audience:'Marketing and communications',description:'Warm header design and contemporary typography.'},
 {id:'modern-slate',name:'Modern Slate',category:'Modern',layout:'single',accent:'#45566a',ink:'#202b38',tag:'ATS-friendly',audience:'Operations and project roles',description:'Strong slate typography with precise alignment.'},
 {id:'modern-sky',name:'Modern Sky',category:'Modern',layout:'single',accent:'#008bb8',ink:'#1a3646',tag:'ATS-friendly',audience:'Fresh graduates and IT support',description:'Airy layout with a subtle blue professional header.'},
 {id:'modern-emerald',name:'Modern Emerald',category:'Modern',layout:'single',accent:'#06835f',ink:'#17382e',tag:'ATS-friendly',audience:'Finance, data and administration',description:'Crisp emerald headings and simple single-column structure.'},
 {id:'modern-plum',name:'Modern Plum',category:'Modern',layout:'single',accent:'#9854a5',ink:'#342638',tag:'Modern',audience:'Education and client-facing roles',description:'Soft plum title accents and balanced whitespace.'},
 {id:'professional',name:'Professional Indigo',category:'Professional',layout:'band',accent:'#354c87',ink:'#253353',tag:'ATS-friendly',audience:'Business and experienced applicants',description:'Confident navy header with polished section dividers.'},
 {id:'executive-navy',name:'Executive Navy',category:'Professional',layout:'band',accent:'#15355c',ink:'#172c45',tag:'Professional',audience:'Senior and management positions',description:'Executive-style top band and structured content.'},
 {id:'executive-black',name:'Executive Charcoal',category:'Professional',layout:'single',accent:'#292b36',ink:'#212126',tag:'ATS-friendly',audience:'Leadership and corporate applications',description:'Confident monochrome typography without excessive decoration.'},
 {id:'classic',name:'Classic Professional',category:'Professional',layout:'single',accent:'#303030',ink:'#212121',tag:'ATS-friendly',audience:'Government and conservative industries',description:'Traditional single-column layout with simple section rules.'},
 {id:'minimal',name:'Minimal ATS',category:'Minimal',layout:'single',accent:'#52525b',ink:'#2d2d31',tag:'ATS-friendly',audience:'General online applications',description:'Almost decoration-free, easy-to-read structure.'},
 {id:'clean-gray',name:'Clean Gray',category:'Minimal',layout:'single',accent:'#64748b',ink:'#283444',tag:'ATS-friendly',audience:'General and entry-level work',description:'Clean grayscale organization with understated rules.'},
 {id:'graduate',name:'Graduate Fresh',category:'Minimal',layout:'single',accent:'#3267b5',ink:'#253a58',tag:'ATS-friendly',audience:'Internship, OJT and fresh grads',description:'Compact education-first feel with crisp blue accents.'},
 {id:'timeline',name:'Timeline Pro',category:'Creative',layout:'timeline',accent:'#7045b2',ink:'#2c2740',tag:'Designed',audience:'Design and product portfolios',description:'Purple vertical experience timeline with tasteful markers.'},
 {id:'tech-split',name:'Tech Split',category:'Creative',layout:'two-column',accent:'#266dd0',ink:'#1d3551',tag:'Designed',audience:'Developers and technical portfolios',description:'Skills panel and a two-column technical resume layout.'},
 {id:'creative-sidebar',name:'Creative Sidebar',category:'Creative',layout:'sidebar',accent:'#6937b7',ink:'#28213e',tag:'Designed',audience:'Creative professionals and designers',description:'Colored sidebar with skills and education grouped together.'},
 {id:'editorial',name:'Elegant Editorial',category:'Creative',layout:'editorial',accent:'#866b50',ink:'#3f352e',tag:'Designed',audience:'Writing, teaching and communications',description:'Elegant serif heading and editorial-style ruled sections.'},
 {id:'bold-header',name:'Bold Header',category:'Creative',layout:'band',accent:'#c34b3c',ink:'#38241f',tag:'Designed',audience:'Marketing and visual resumes',description:'Eye-catching warm banner with minimal body decoration.'}
] as const;
export type ResumeTemplateId = (typeof RESUME_TEMPLATES)[number]['id'];
export type ResumeTemplate = (typeof RESUME_TEMPLATES)[number];
export type TemplateCategory='All'|ResumeTemplate['category'];
export const TEMPLATE_CATEGORIES:TemplateCategory[]=['All','Modern','Professional','Minimal','Creative'];
export function getResumeTemplate(id?:string):ResumeTemplate {
 return RESUME_TEMPLATES.find(t=>t.id===id)??RESUME_TEMPLATES[0];
}
export function isDesignForward(id?:string):boolean {
 const template=getResumeTemplate(id);
 return template.category==='Creative';
}
