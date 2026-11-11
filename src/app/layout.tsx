import type { Metadata } from 'next';
import './globals.css';
import './ui.css';
import './resume-templates.css';
import './template-gallery.css';
export const metadata: Metadata = {
  title: 'ResumeBuilder — AI Resume Builder & Job Matching',
  description: 'Create your resume, check ATS readiness, discover matching roles, and practice interviews.'
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
