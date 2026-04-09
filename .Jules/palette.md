## 2025-04-09 - Native Button vs Div for Mobile Menu Toggle
**Learning:** When adding accessibility to legacy custom components (like a mobile menu toggle), it's highly preferred to refactor `div` elements into semantic `<button>` elements rather than adding `role="button"` and `tabindex="0"`. Native `<button>` elements inherently handle keyboard interactions (Space and Enter keys) and focus states, reducing custom JavaScript and styling overhead.
**Action:** Prioritize transforming interactive `div`s into `<button>`s with necessary CSS resets (`background: none; border: none; padding: 0; color: inherit; font: inherit;`) over piling ARIA attributes onto non-semantic elements.

## 2025-04-09 - Focus Visible on Custom Buttons
**Learning:** Adding custom hover states and active states to button components (`.btn`, `.btn-icon`) often inadvertently overrides native focus states if not carefully managed. It's crucial to explicitly define `:focus-visible` states to ensure keyboard accessibility.
**Action:** When working with custom interactive elements, especially those involving CSS transitions or transformations, always verify and add explicit `:focus-visible` styles that provide clear, high-contrast visual indicators for keyboard navigation, matching the design system's focus ring styles.
