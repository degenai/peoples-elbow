# The People's Elbow: To-Do List

**Last Updated:** January 11, 2026  
**Current Focus:** V2 Cleanup (see `handoffs/V2_ROADMAP_HANDOFF.md` for detailed roadmap)

---

## 🎯 V2 Cleanup Priority (February 2026)

### Phase 1: Hygiene & Critical Fixes ✅ COMPLETED
- [x] Create `_deprecated/` folder and move legacy files
- [x] Fix version badge API endpoint bug
- [x] Remove legacy changelog loading from index.html
- [x] Delete disabled workflow files
- [x] Consolidate documentation in `docs/` folder

### Phase 2: Documentation Cleanup
- [ ] Update TODO.md with V2 priorities (this file)
- [ ] Create `docs/ARCHITECTURE.md` from handoff doc
- [ ] Review and update `docs/PROJECT_OVERVIEW.md`

### Phase 3: CSS Modularization
- [ ] Split `main.css` (~1500 lines) into logical modules
- [ ] Create `css/base.css` (reset, variables, typography)
- [ ] Create `css/layout.css` (header, footer, containers)
- [ ] Create `css/components.css` (buttons, forms, cards)
- [ ] Create `css/sections.css` (hero, mission, services, etc.)
- [ ] Update `main.css` to use `@import` for modules

### Phase 4: JS Modularization
- [ ] Extract particle effect code from `index.html` to `js/effects.js`
- [ ] Extract parallax scroll code from `index.html` to `js/effects.js`
- [ ] Review and clean up `main.js`
- [ ] Remove redundant version fetching (components.js handles it)

### Phase 5: HTML Cleanup
- [ ] Extract all inline styles from `index.html` (~200 lines)
- [ ] Create proper CSS classes for "Who Is" section
- [ ] Simplify "Build 100 Milestone" section
- [ ] Create single "WIP" page to replace placeholder pages
- [ ] Move version badge from header to footer with date format
- [ ] Update navigation to reference single WIP page

### Phase 6: Content Updates
- [ ] Simplify Impact section (just events/people/funds)
- [ ] Update value proposition copy
- [ ] Add real event data when available

---

## 📋 Backlog (Post-V2)

### Form System (Working - Low Priority)
- [x] Create D1 database and tables
- [x] Store form submissions in D1 database
- [x] Add proper form validation and error handling
- [x] Set up Email Routing
- [ ] Create simple admin view for database submissions
- [ ] Add CSRF protection to forms

### Website Features
- [ ] Update impact tracker with real statistics
- [ ] Interactive map showing service locations
- [ ] Calendar integration for availability
- [ ] Photo gallery from events

### Content & Community
- [x] Add "Who is The People's Elbow?" profile section ✅
- [ ] Add host testimonials (need real content)
- [ ] Create digital media kit for hosts
- [ ] Comprehensive setup guide for "Steal This Site"

### Technical Debt
- [ ] Add proper test suite for worker functions
- [ ] Implement rate limiting on form submissions
- [ ] Create backup system for D1 database
- [ ] Add monitoring for Worker errors
- [ ] Eventually gitignore `_deprecated/` folder

---

## 📝 Notes

- **Branch Strategy:** V2 work should be done on `v2-cleanup` branch, tested, then PR'd to main
- **Reference:** See `handoffs/V2_ROADMAP_HANDOFF.md` for detailed implementation plans
- **Work Schedule:** 1-2 days/week starting February 2026
