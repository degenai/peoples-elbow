# Commit Message Guidelines - The People's Elbow

**Last Updated:** January 11, 2026

## Quick Reference (For D1 Changelog Auto-Generation)

The D1 changelog system automatically captures commits that use **conventional commit prefixes**. Use this format for most commits:

```
type: short description

Optional longer description if needed.
```

### Prefixes That Trigger Changelog Entry

| Prefix | When to Use | Example |
|--------|-------------|---------|
| `feat:` | New feature | `feat: add host testimonials section` |
| `fix:` | Bug fix | `fix: mobile menu not closing on click` |
| `docs:` | Documentation | `docs: update README with deploy steps` |
| `style:` | CSS/visual changes | `style: improve button hover states` |
| `refactor:` | Code restructuring | `refactor: extract particle effects to module` |
| `chore:` | Maintenance/cleanup | `chore: move deprecated files to _deprecated` |
| `perf:` | Performance improvement | `perf: optimize image loading` |
| `build:` | Build/CI changes | `build: update deploy workflow` |
| `test:` | Testing | `test: add form validation tests` |

### Skip Changelog Entry

Add `[skip ci]` anywhere in the message to skip both CI pipeline and changelog:
```
chore: update generated files [skip ci]
```

### Examples

**Simple feature:**
```
feat: add contact form email notifications
```

**Bug fix with context:**
```
fix: version badge showing wrong number

The API endpoint was using /api/changelog instead of root path.
Updated both main.js and components.js.
```

**Refactoring with details:**
```
refactor: extract inline styles from index.html

WHAT:
- Moved 200+ lines of inline styles to CSS classes
- Created who-section, who-grid, who-content classes

WHY:
- Improves maintainability
- Enables CSS modularization
```

---

## Extended Format (For Major Changes)

For significant changes, use this detailed structure that's both developer-useful AND community-readable:

```
feat: [Feature Name] - [One-line summary]

WHAT:
- [Specific changes made]
- [Components affected]

WHY:
- [Problem being solved]
- [Community benefit]

TECHNICAL:
- [Implementation details]
- [Breaking changes if any]
```

### Example Extended Format

```
feat: universal header/footer component system

WHAT:
- Created reusable header.html and footer.html components
- Added components.js loader with caching
- Updated all pages to use component placeholders

WHY:
- Single source of truth for navigation
- Easier to update site-wide elements
- Reduces code duplication across 7+ pages

TECHNICAL:
- Components load via fetch(), requires HTTP server
- Auto-highlights current page in navigation
- Initializes mobile menu after component load
```

---

## Audience & Tone

- **Primary**: Future developers/AI agents working on the code
- **Secondary**: Community members viewing the changelog
- **Style**: Clear, honest, jargon-lite when possible
- **Voice**: Professional but approachable

## Impact Indicators (Optional)

Use emoji prefixes for quick visual scanning in changelog:
- ✨ Major new feature
- 🐛 Bug fix
- 🔧 Enhancement/improvement
- 📝 Documentation
- ♻️ Refactoring

Example: `feat: ✨ universal component system`

---

## Remember

This is a **mutual aid project**. Commit messages should:
- Be honest about what changed and why
- Connect technical changes to community benefit when relevant
- Avoid hype - focus on practical improvements
- Be useful to the next person (human or AI) who reads them
