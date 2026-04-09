## $(date +%Y-%m-%d) - Adding ARIA labels to icon-only buttons
**Learning:** Found a widespread pattern in this app's components where icon-only buttons lacked ARIA labels (only having `title`). This is bad for screen reader accessibility. Added `aria-label` to these buttons.
**Action:** Always ensure that icon-only buttons have an `aria-label` attribute in addition to a `title` attribute for screen readers.
