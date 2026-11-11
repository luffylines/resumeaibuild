# ResumeBuilder Demo Mode — preview-only product experience

This code implements demo restrictions on the **ResumeBuilder** site only.

## Preview-only affordances

Unauthenticated visitors can open the demo workspace, create or edit resumes, select templates, edit cover-letter text, and see watermarked previews. Demo drafts remain in browser-local storage and may not sync to another device.

### Resume Builder

- The real PDF, DOCX, PNG, editable DOCX, text PDF, Print, and Canva handoff controls are **not rendered** for demo visitors.
- Client export handlers refuse to run when `isDemo`; clean, offscreen export artwork is also excluded from demo DOM.
- A responsive locked card explains how to create an account.
- The visible preview includes three diagonal **DEMO · PREVIEW ONLY** watermarks.
- Print CSS hides the clean resume output while the demo editor is open.

### Cover Letter

- Demo visitors can edit a local sample letter, which survives navigation/refresh on the same browser.
- No AI generation, Copy, or Download controls appear in demo.
- The demo textarea has a visible watermark and blocks its normal `copy` event, while permitting editing.
- Live, signed-in accounts retain the existing AI generation, copy, and text download experience.

## Security limitations and upgrade path

**A website cannot reliably prevent screenshots, screen recording, camera photos, browser developer tools, or extraction of text already delivered to the browser.** A watermark discourages reuse but cannot enforce a strong no-copy restriction. Do not describe demo content as screenshot-proof.

Client UI restrictions are suitable for preventing ordinary use of download buttons in the preview/demo experience. If resume exports become a paid entitlement, **do not trust frontend `isDemo` or user-editable `user_metadata`** for authorization. Move exports behind authenticated server routes, verify the user's Supabase session and actual server-side subscription entitlements, and render full-resolution export artwork only after authorization. This code does **not** implement paid export enforcement or modify any Supabase/Vercel account.

## CI smoke checks

`scripts/check-mobile.cjs` verifies demo has no download/print/Canva buttons or clean export target, its resume preview has a watermark, print styling hides the resume, and a cover letter remains editable and locally saved without copy/download UI. Tests do not assert screenshots are technologically impossible.
