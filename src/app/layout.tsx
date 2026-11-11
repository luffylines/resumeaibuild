import type { Metadata, Viewport } from 'next';
import './globals.css';
import './ui.css';
import './resume-templates.css';
import './template-gallery.css';
import './mobile-modern.css';
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};
export const metadata: Metadata = {
  title: 'ResumeBuilder — AI Resume Builder & Job Matching',
  description: 'Create your resume, check ATS readiness, discover matching roles, and practice interviews.'
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
