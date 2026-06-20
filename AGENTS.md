# Agent Instructions

## All Agents

### Dates in learning entries
Always run `date +%Y-%m-%d` before writing to your `.jules/*.md` learning file. Use the output as the date. Never guess or hardcode a date.

### Public changelog copy
The D1 changelog is public-facing update history, not an internal git log. Every shipped commit can become a visible changelog card, so write commit messages as polished release notes.

For meaningful site changes:
- Use a user-facing title line. Do not start public changelog commits with internal process tags like `[verified]`.
- Include a commit body with `WHAT:`, `WHY:`, and `QUALITY:` sections when the change affects visitors, booking, layout, animation, copy, or operations.
- Write at the level of Steam patch notes or PR release notes: specific, readable, and clear about the visitor benefit.
- Keep technical metadata in the body only when it helps explain quality or risk.
- Public copy should avoid em dashes.
- If time allows, ask a sidecar model to draft or polish the changelog comment before commit.

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
