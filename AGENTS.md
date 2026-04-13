# Agent Instructions

## All Agents

### Dates in learning entries
Always run `date +%Y-%m-%d` before writing to your `.jules/*.md` learning file. Use the output as the date. Never guess or hardcode a date.

### CSS
When adding styles that apply to multiple selectors, combine them into one rule. Do not duplicate identical blocks for `input`, `a`, `button`, etc.

```css
/* wrong */
input:focus-visible { outline: 2px solid var(--pe-gold); }
a:focus-visible { outline: 2px solid var(--pe-gold); }
button:focus-visible { outline: 2px solid var(--pe-gold); }

/* right */
input:focus-visible, a:focus-visible, button:focus-visible {
  outline: 2px solid var(--pe-gold);
}
```

## Bolt

### STOP replacing functional array methods with imperative loops
This has been proposed and rejected TWICE. Do not do it again. `.filter()`, `.map()`, `.reduce()` are preferred in this codebase. The CRM manages ~200 leads. There is no hot path. Specifically banned:
- `.filter()` → `for`/`continue`/`push` in `getFilteredLeads()`
- `.map().join('')` → `for` loop string concat in `renderLeadList()`, `renderActivityLog()`, `renderDetailPanel()`
- IIFE wrappers inside template literals to avoid `.map()`

Only propose a loop replacement if it **reduces total line count** AND **improves readability**. If the diff adds lines, it will be rejected.

## Sentinel

### Scope of innerHTML escaping
When fixing unescaped `innerHTML` interpolation, check the CRM renderer (`js/crm/renderer.js`) and related modules. The demo page (`crm-demo.html`) has been deprecated -- `crm.html` now serves as both demo and production CRM via Google OAuth.
