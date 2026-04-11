## 2026-04-10 - Adding :focus-visible to interactive elements
**Learning:** Implementing `:focus-visible` styles using existing brand colors (like `var(--pe-gold)`) provides a huge accessibility win for keyboard navigation while maintaining visual design for mouse users, a practice often overlooked in custom UI.
**Action:** Always verify keyboard focus states and add `:focus-visible` to interactive elements like buttons and links to ensure keyboard navigation is clear and accessible.

## 2026-04-10 - Explicitly associating form labels with for attributes
**Learning:** Adding `for` attributes to `<label>` elements linking them to their corresponding `id` of an `<input>`, `<select>`, or `<textarea>` is critical. Implicit labels or standalone labels are not consistently interpreted correctly by screen readers, particularly when they are separated by DOM hierarchy or when dealing with complex input widgets like `<input type="range">`.
**Action:** Always guarantee that `<label>` tags use a explicit `for="[id]"` attribute that accurately references their input, ensuring proper programmatic association.
