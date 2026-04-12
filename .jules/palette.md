## 2026-04-10 - Adding :focus-visible to interactive elements
**Learning:** Implementing `:focus-visible` styles using existing brand colors (like `var(--pe-gold)`) provides a huge accessibility win for keyboard navigation while maintaining visual design for mouse users, a practice often overlooked in custom UI.
**Action:** Always verify keyboard focus states and add `:focus-visible` to interactive elements like buttons and links to ensure keyboard navigation is clear and accessible.
## 2026-04-12 - Missing keyboard events for elements with role="button"
**Learning:** Elements styled as buttons using `role="button"` and `tabindex="0"` (like `.console-header` in this app) are often given `click` event listeners but miss the `keydown` handlers for 'Enter' and 'Space'. This completely blocks keyboard users from interacting with them.
**Action:** When inspecting non-native semantic elements that have interactive roles, always ensure they have both `click` and `keydown` event listeners, and ensure focus visible states are correctly defined in CSS.
