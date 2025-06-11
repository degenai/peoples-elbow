# The People's Elbow: To-Do List

## Current Tasks

### Form System
- [x] Create D1 database and tables
- [x] Convert worker to ES module format
- [x] Store form submissions in D1 database
- [x] Add proper form validation and error handling
- [x] Replace MailChannels with Cloudflare's sendEmail binding
- [x] Set up Email Routing for peoples.elbow.massage@gmail.com
- [x] Configure wrangler.toml with appropriate email binding

### Website Improvements
- [ ] Create simple admin view for database submissions
- [ ] Update impact tracker with real statistics from D1
- [ ] Add more form validation on the frontend
- [ ] Improve loading indicators during form submission
- [ ] Add CSRF protection to forms (security enhancement)
- [x] Add update log/changelog page that displays commit messages
- [x] Implement version numbering system based on git commit count (`git rev-list --count HEAD`)
- [x] Update README to better highlight mutual aid aspects and focus
- [x] Create universal header/footer component system (v99-100)
- [x] Clean up debug console.log statements for production readiness
- [x] Add version 100 milestone celebration and site philosophy section

### Content & Community
- [ ] Add "Who is The People's Elbow?" profile section with teaser photo
- [ ] Add more host testimonials
- [ ] Update venue types based on actual submissions
- [ ] Create digital media kit for hosts
- [ ] Expand community impact section

## Future Features (from wishlist)
- [ ] Interactive map showing service locations
- [ ] Calendar integration for availability
- [ ] Digital contract generation for hosts
- [ ] Photo gallery from events
- [ ] Visual impact metrics dashboard
- [ ] Comprehensive setup guide for other mutual aid projects

## Technical Debt
- [ ] Add proper test suite for worker functions
- [ ] Implement rate limiting on form submissions
- [ ] Create backup system for D1 database
- [ ] Add monitoring for Worker errors
- [ ] Improve early commit messages with more detailed descriptions for Development Ring display
