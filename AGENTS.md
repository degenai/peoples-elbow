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

### Do not replace functional array methods with imperative loops for readability loss
`.filter()`, `.map()`, `.reduce()` are preferred over `for` loops when they make the code shorter or equally readable. Only replace them if the loop version is genuinely simpler or reduces lines of code. This CRM manages ~200 leads; there is no performance-critical hot path. Do not introduce `let`/`continue`/`push` patterns that are longer and harder to read than the functional equivalent they replace.

## Sentinel

### Scope of innerHTML escaping
When fixing unescaped `innerHTML` interpolation, also check `crm-demo.html` and the demo renderer -- the demo and production CRM share patterns and both need fixes.
