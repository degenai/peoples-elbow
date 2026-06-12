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
- `.filter()` → `for`/`continue`/`push` loops in `js/crm/store.js` / `js/crm/route.js`
- `.map().join('')` → `for` loop string concat in `renderList()` / `renderDetail()` in `js/crm/render.js`
- IIFE wrappers inside template literals to avoid `.map()`

Only propose a loop replacement if it **reduces total line count** AND **improves readability**. If the diff adds lines, it will be rejected.

## Sentinel

### Scope of innerHTML escaping
The v2 CRM renderer (`js/crm/render.js`) builds DOM via `<template>` clone + `textContent` only — there is no `innerHTML`-of-data path to escape. The one HTML-string path is the downloadable route-notes file in `js/crm/route.js` (`generateNotesHTML`), where every lead value goes through `escapeHtml()`. `crm.html` serves as both demo and production CRM (signed-out shows demo data; Google sign-in loads your Drive).
