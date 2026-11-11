import type {Resume} from './types';
import {sampleResume} from './types';

/**
 * Showcase-only applicant. The gallery always demonstrates the complete
 * template, even when the signed-in user's resume is new or empty.
 * Never apply this data to the user's resume or store it in their account.
 */
export const templatePreviewResume:Resume={
 ...sampleResume,
 id:'gallery-preview-not-a-user-resume',
 title:'Gallery Sample — Project Specialist',
 name:'JORDAN REYES',
 email:'jordan.reyes@example.com',
 phone:'+63 900 000 0000',
 location:'Quezon City, Philippines',
 portfolio:'portfolio.example',
 summary:'Organized and adaptable professional with experience coordinating digital projects, collaborating with cross-functional teams, documenting workflows, and delivering clear, accessible solutions. Skilled at problem-solving, research, and communicating with stakeholders.',
 skills:'Project Coordination, Communication, Microsoft Office, Research, Documentation, Figma, Data Analysis, Collaboration, Problem Solving',
 experience:[
  {id:'gallery-ex-1',role:'Project Coordinator',company:'Sample Creative Studio',dates:'2023 – Present',details:'Coordinated project schedules and deliverables, created progress reports, and worked with stakeholders to improve daily workflows and maintain service quality.'},
  {id:'gallery-ex-2',role:'Operations Intern',company:'Example Technology Group',dates:'2022 – 2023',details:'Supported team communication, maintained documentation, and helped prepare customer-facing materials and project presentations.'}
 ],
 education:[{id:'gallery-ed-1',school:'Sample State University',degree:'Bachelor of Science in Information Technology',dates:'2018 – 2022'}],
 projects:[
  {id:'gallery-project-1',name:'Community Information Portal',role:'Project Lead',link:'',details:'Designed a responsive information portal and coordinated testing, documentation, and feedback from project stakeholders.'}
 ],
 certifications:[{id:'gallery-cert-1',title:'Project Management Foundations',issuer:'Sample Learning Institute',year:'2023',details:''}],
 languages:[{id:'gallery-lang-1',name:'English',level:'Professional'},{id:'gallery-lang-2',name:'Filipino',level:'Fluent'}],
 awards:[{id:'gallery-award-1',title:'Team Excellence Recognition',issuer:'Sample Creative Studio',year:'2024',details:'Recognized for reliable project coordination and teamwork.'}],
 volunteer:[{id:'gallery-vol-1',role:'Event Volunteer',organization:'Local Community Program',dates:'2022',details:'Assisted with registration and event communications.'}],
 references:[],
 additionalInfo:'',
 photo:null,
 accentColor:undefined,
 backgroundColor:'#FFFFFF'
};
