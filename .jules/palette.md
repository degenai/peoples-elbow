## 2026-04-10 - Adding :focus-visible to interactive elements
**Learning:** Implementing `:focus-visible` styles using existing brand colors (like `var(--pe-gold)`) provides a huge accessibility win for keyboard navigation while maintaining visual design for mouse users, a practice often overlooked in custom UI.
**Action:** Always verify keyboard focus states and add `:focus-visible` to interactive elements like buttons and links to ensure keyboard navigation is clear and accessible.

## 2026-04-10 - Adding loading state to async form submits
**Learning:** For an application interacting with a backend asynchronously (e.g., Cloudflare KV), users can be left wondering if their action succeeded if there's no visual loading feedback. The login form had a spinner but the CRM and public forms lacked a consistent loading indicator, creating a disjointed UX.
**Action:** Always provide immediate visual feedback (like a loading spinner and changing button text) when a user submits an async form. Disable the button during the operation to prevent duplicate submissions.
