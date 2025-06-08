-- D1 Changelog Population - Curated Development History
-- Generated: 2025-06-08T19:06:10.705Z
-- Total meaningful commits: 87

-- Clear existing data
DELETE FROM changelog_entries;

-- Insert meaningful commits
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('6ad72f49955ee39acf1ba4abce645034e25d2d12', 'Initial commit', '2025-04-23 02:14:38 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('e19c34c1e70af8d261e65c9b1851d71b4e0d1060', 'Add CNAME for custom domain', '2025-04-23 02:20:53 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('cdbfe344f157fc4cdcc1604934287b9f929637e0', 'Create initial homepage', '2025-04-23 02:21:39 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('a5c3ad06902e7218e78455d323ce74d39e79d79b', 'Add main CSS stylesheet', '2025-04-23 02:22:32 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('4725f4fc18f56c606c454707f0d0b3cb4c32872b', 'Add main JavaScript file', '2025-04-23 02:22:48 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('f7e27d11882cd066d47e5a8ab552299040a6ec53', 'Create images directory', '2025-04-23 02:23:16 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('89d0f152a23c6ee1062f70b3f8c404834f50e498', 'Update README with website info and GitHub Pages setup', '2025-04-23 02:23:36 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('bc744731e22cf86d35618cfd832a1aca2bec08aa', 'Add files via upload

AI generated placeholder logo', '2025-04-23 02:30:41 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('ab2d0ef9601a36a0c45f5d858a8d62ff839b0b0e', 'Update mission tagline and host quote, add initial .gitignore file', '2025-04-23 22:17:58 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('2b958de6e2fdcad0975a307a12de4e3791e1866b', 'Update Instagram handle and footer quote for brand consistency', '2025-04-23 22:53:15 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('2eb926e464e29f7fe9382a1b12105544dee43dbe', 'Add Instagram links and create initial site structure with forms and styling', '2025-04-23 23:31:35 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('fe6efdd94ae7eb1131a791acd7f7769a9c5db78b', 'Add Cloudflare Workers configuration for host and contact form handlers', '2025-04-23 23:33:58 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('94738e972a7ec0d932afa0eecb7b429489f70d6c', 'Consolidate worker configs into single Cloudflare worker deployment', '2025-04-23 23:37:20 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('74e6ba76ede18e8399ab0818addf4f6004743b25', 'Add main.js with form handling, smooth scroll, and stats animation features', '2025-04-23 23:41:17 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('0500b27a28f4f461e8235bdbbf0c082c58b9f511', 'Add main CSS styles and footer disclaimer for bug reporting', '2025-04-23 23:45:24 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('ff26e1aff752a8afea692e466ce003a292ed5420', 'Add initial styles and form handling for host connection feature', '2025-04-23 23:59:30 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('e39bc886923561f8d5c42bcae10063a6202b64a2', 'Add form submission handling with D1 database and email notifications', '2025-04-24 01:25:28 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('eebdb382d16ae30abe76b9dfd359c1b7e6180484', 'Add form handling worker and fix D1 database binding in wrangler config', '2025-04-24 01:31:11 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('8760e519d03bb1bcfd4657ba4aedf6746ee8115c', 'Add D1 database storage and MailChannels email integration to form handlers', '2025-04-24 02:00:13 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('1c2d3697828ddfa863c6ef54f3a19c8c8f288503', 'feat: Add D1 database integration with migrations

- Create SQL migration file for host_submissions and contact_submissions tables
- Add diagnostic logging to worker to debug database connection
- Temporarily use workers.dev email domain for MailChannels authorization
- Successfully connected form submissions to D1 database storage', '2025-04-24 02:19:06 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('dfac9e7943bc922f4ac7152f29a9a83ab1f264f9', 'feat(forms): Add D1 database storage and MailChannels email integration

- Create proper SQL migrations for host_submissions and contact_submissions tables
- Add database connectivity diagnostics for debugging connection issues
- Implement MailChannels integration with proper DKIM authentication
- Update worker to ES module format for D1 compatibility
- Fix email sending with correct reply-to headers for better deliverability

This completes the backend infrastructure for form processing, providing both
reliable data storage in D1 and email notifications via MailChannels.', '2025-04-24 02:23:38 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('1cea25faccf7b555648a822fb1c075057981decf', 'feat(forms): Add D1 database storage and prepare email integration', '2025-04-24 02:40:05 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('ce9abdba5ad183ad47e4d606dcb1dc01b9aff4ef', 'docs: Add project TODO list for tracking future enhancements

Add structured TODO.md file to track:
- Current form system tasks and remaining email integration
- Planned website improvements for admin features
- Content and community enhancement priorities
- Future feature roadmap from the wishlist
- Technical debt items to address

This provides a clear development roadmap for the project.', '2025-04-24 02:48:17 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('eda2e01bdc9b39d0d6f6cb5ac0094a6ffcf3b40f', 'feat(forms): Complete robust form handling with D1 storage and email notifications

WHAT:
- Implement Cloudflare''s native EmailMessage system for reliable notifications
- Replace MailChannels dependency with Cloudflare''s first-party email solution
- Add proper MIME-formatted emails with complete headers (From, To, Subject, Content-Type)
- Include unique Message-ID and formatted timestamps per email
- Ensure continued D1 database storage of all form submissions
- Structure error handling to provide better debugging information

WHY:
- Aligns with mutual aid principles by using free, reliable infrastructure
- Eliminates external API dependencies keeping everything community-controlled
- Provides reliable notification system without proprietary services
- Ensures form data is both preserved in database and delivered via email
- Creates a more maintainable system with fewer points of failure

TECHNICAL DETAILS:
- Import EmailMessage from ''cloudflare:email'' module
- Configure binding in wrangler.toml for peoples.elbow.massage@gmail.com
- Format emails with proper headers according to SMTP/MIME standards
- Generate unique message IDs to prevent email threading issues
- Maintain nested try/catch blocks for granular error reporting
- Store ISO timestamps for all database entries

This completes our form handling system with both reliable storage
and notification capabilities, while maintaining our mutual aid
ethos of minimizing dependencies and vendor lock-in.', '2025-05-06 14:22:11 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('369db58ce4cb73bfdbc17ca03f03b8aa6618eb42', 'feat(changelog): Add version tracking and update log page

WHAT:
- Create changelog.html page with development history timeline
- Design responsive layout with expandable commit details
- Implement version data generation from git history
- Add version badge to main site header linking to changelog
- Set up GitHub Actions workflow for automatic version updates
- Style timeline with color-coding based on commit types
- Preserve full commit message details for technical reference

WHY:
- Provides transparency about ongoing development
- Makes version information easily accessible
- Creates historical record of project improvements
- Follows mutual aid principles of openness and sharing
- Balances readability for general users with technical detail for developers

TECHNICAL:
- Uses vanilla JavaScript for timeline and expand/collapse functionality
- Implements Node.js script to generate version data from git
- Ensures proper display on both desktop and mobile devices
- Sets up automation to keep version data current
- Uses CSS transitions for smooth UI interactions

This feature enhances the site''s usefulness while maintaining our project''s
commitment to accessibility and transparency.', '2025-05-07 03:07:15 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('67d010611642b9617f42009ff32a9dae5ce4742d', 'fix(changelog): Enhance header styling and update version data

WHAT:
- Improve visual impact of changelog header with more dramatic styling
- Increase title size and add subtle rotation for visual interest
- Implement pulsing animation on version badge for better visibility
- Update version-data.js to reflect latest changes (version 25)
- Fix background contrast and spacing for better readability

WHY:
- Original header design was visually underwhelming
- Version data needed to be updated to show latest changes
- Enhanced styling maintains consistency with the site''s wrestling theme
- Visual improvements make the changelog more engaging for visitors

TECHNICAL DETAILS:
- Add CSS animations for subtle movement and attention
- Implement multi-layered text shadows for depth effect
- Use transform properties for visual interest
- Generate updated version data from git history
- Optimize header for both mobile and desktop viewing

These changes improve the visual presentation of our changelog while
ensuring it shows the most current version information.', '2025-05-07 03:16:19 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('1df2575f02c53e606dac7251338683e35272bbf2', 'fix(ci): Add explicit write permissions to GitHub Action workflow

WHAT:
- Add top-level permissions declaration for repository contents
- Include explicit GITHUB_TOKEN with write permissions in checkout step
- Maintain all other workflow functionality and loop prevention

WHY:
- Ensures the version-data.js file is properly updated after commits
- Fixes potential permission issues when Action tries to push changes
- Maintains automation without requiring manual version updates
- Completes the circular integration between code changes and version tracking

This ensures our changelog system works reliably by allowing
the GitHub Action to properly update version data after commits.', '2025-05-07 03:29:10 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('a5aa6b3365c4f8719e4c91f93cc6a4c508b83635', 'feat(calendar): Add appointment booking system with wrestling-themed UI

WHAT:
- Create responsive calendar page with "The Appointment Arena" header
- Implement Event Calendar system via UNPKG CDN integration
- Design booking interface with clear wrestling-themed messaging
- Add placeholder events for visual demonstration
- Build database schema for future backend implementation
- Include "Coming Soon" notice directing to existing contact form
- Add playful "Technicality No Down Boo Over!" 404 page

WHY:
- Provides transparent view of massage session availability
- Creates foundation for future booking system automation
- Enhances user journey with cohesive wrestling-themed UX
- Aligns with mutual aid principles of openness and accessibility
- Maintains clear expectations through appropriate "Coming Soon" messaging
- Adds personality with tasteful comedy references

TECHNICAL:
- Integrates Event Calendar library via CDN for minimal maintenance
- Creates CSS that extends existing design language
- Prepares database migration file for D1 integration
- Builds worker handlers for future booking functionality
- Ensures responsive design that works on all devices
- Structures event data format compatible with future FullCalendar upgrade path

This implementation establishes Phase 1 of the calendar system with
a complete frontend that integrates seamlessly with the existing site.
Phase 2 will add admin login and backend functionality once this foundation
is in place.', '2025-05-09 01:29:12 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('2f050b87d4aea23fbe2772cb9547c47eb6a090f9', 'fix: Update calendar favicon and optimize GitHub Actions workflow

WHAT:
- Add custom favicon using logo.png for the calendar page
- Modify GitHub Actions workflow to run sequentially after Pages deployment
- Change workflow trigger from direct push events to workflow_run events
- Remove paths-ignore filter that prevented version data updates
- Maintain explicit write permissions for repository content access

WHY:
- Creates a more cohesive brand experience by using logo as favicon
- Resolves workflow conflicts between Pages build and version updates
- Prevents "high priority waiting request" cancellations in GitHub Actions
- Ensures version data is properly updated after site changes
- Maintains the transparency principle of displaying latest version info

TECHNICAL:
- Updated shortcut icon link in calendar.html to use images/logo.png
- Changed image/x-icon type to image/png for proper mime-type handling
- Modified workflow trigger to use workflow_run event type with completed status
- Configured workflow to specifically watch the pages-build-deployment workflow
- Removed paths-ignore that was no longer needed with sequential execution

These changes improve the user experience with proper favicon support while
ensuring our automated versioning system works reliably without conflicts.
They maintain our commitment to transparency through accurate changelog
information.', '2025-05-09 01:49:48 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('c378755be0ffbcd4a8a42452b7726df7526131fe', 'fix(ci): prevent GitHub Actions infinite loop

WHAT:
- Add file change detection to stop workflow from self-triggering
- Make version updates conditional on non-version-data.js changes
- Properly structure jobs with dependencies and conditions
- Improve git commands with better error handling

WHY:
- Prevents the infinite loop we just created between workflow runs
- Stops GitHub from burning through action minutes on repeated jobs
- Maintains version tracking integrity for meaningful changes only
- Preserves automatic updates while preventing recursion

This critical fix ensures our versioning system only triggers when
real content changes, not when the system updates itself.', '2025-05-09 01:56:39 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('8d149787d691309e0d55baaf02c741d3f5857eb5', 'docs(ci): add site-wide favicon and document CI/CD workflow lessons

WHAT:
- Update all site pages to use logo.png as favicon for consistent branding
- Add comprehensive CI-LESSONS.md document in new docs directory
- Remove duplicate favicon reference in 404.html
- Document "The Great Version Inflation of 2025" event
- Share lessons learned from our accidental workflow recursion

WHY:
- Creates consistent branding across all site pages
- Preserves the educational experience of our CI/CD adventure
- Documents important technical learnings for future reference
- Serves as a case study in proper workflow design
- Turns an automation mishap into a valuable learning moment

TECHNICAL:
- Replace all favicon.ico references with images/logo.png
- Update mime-type from image/x-icon to image/png
- Create structured markdown documentation of the workflow fix
- Include code samples of our recursive protection implementation
- Outline future CI/CD improvement ideas

This commit officially documents our adventure with GitHub Actions workflows
while standardizing the site favicon across all pages. The People''s Elbow
now has both better branding and a battle-tested CI/CD pipeline!', '2025-05-09 02:19:35 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('e853d8bb8ad94a0a37ad0b2f2b30e613bc4ec048', 'docs(changelog): refine project description text

WHAT:
- Update changelog introduction text for a more professional tone
- Maintain focus on the mutual aid mission
- Remove self-deprecating language

WHY:
- Better aligns with the project''s serious mission despite the fun theme
- Creates a more confident presentation of the development journey
- Maintains transparency while focusing on the mutual aid goal

This small text change better represents our project''s vision
while keeping the wrestling theme in the appropriate sections.', '2025-05-10 02:26:57 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('c3ccfeba2d72d016298623e3682cdcbf9142815d', 'fix(ci): improve workflow version detection logic

WHAT:
- Replace file-based change detection with commit message detection
- Add improved debugging with commit history in logs
- Update skip logic to only apply to automated version updates
- Simplify conditional logic for more reliable operation

WHY:
- Fixes legitimate content changes being incorrectly skipped
- Ensures version numbers update properly with all content changes
- Provides better visibility into workflow decision-making
- Makes CI/CD pipeline more robust and predictable

TECHNICAL:
- Switch from git diff file detection to git log commit message analysis
- Include git log output in workflow logs for easier troubleshooting
- Use string matching on specific marker "[skip ci]" for precise control
- Add explanatory comments to make workflow easier to maintain

This change allows our workflow to properly distinguish between
automated version updates and real content changes, ensuring the
changelog stays in sync with development progress.', '2025-05-10 02:39:18 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('4aa2506ae1bd1c8284dff26ce71d4add670bef79', 'refactor(ci): implement unified build and version workflow

WHAT:
- Create combined build-and-version.yml workflow that handles version updates and deployment
- Disable previous update-version.yml workflow file
- Restructure workflow sequence for optimal efficiency
- Add proper job dependencies and concurrency controls

WHY:
- Eliminates redundant page builds after version updates
- Creates a more philosophically "correct" CI/CD pipeline
- Reduces GitHub Actions usage and deployment time
- Simplifies workflow management and debugging
- Follows the "one change, one process" principle

TECHNICAL:
- Configure proper workflow sequential dependencies
- Implement smarter commit message detection for loop prevention
- Add explicit permissions for both repository writes and Pages deployment
- Ensure fresh checkout after version update for accurate deployments
- Maintain compatibility with existing GitHub Pages setup

This optimization creates a single coherent flow from code change to
deployed site with updated version information, eliminating the
previously required double-build process.', '2025-05-10 02:49:00 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('917abaeb7ef70385d5a2f610a08f287d09814f3e', 'fix(changelog): improve timeline script with debug logging

WHAT:
- Add comprehensive debug logging throughout the changelog script
- Fix references to non-existent HTML elements in the version display
- Implement robust error handling for commit history display
- Improve version number updating with class-based selectors

WHY:
- Helps diagnose why commit timeline might not be displaying properly
- Makes error messages more helpful and specific for troubleshooting
- Provides browser console visibility into the script execution flow
- Prevents silent failures when elements aren''t found in the DOM

TECHNICAL:
- Added console logging for each major step in the script execution
- Wrapped timeline display code in try/catch blocks with error reporting
- Modified version number updating to use class selectors as fallback
- Improved error messages to guide debugging efforts
- Removed reference to non-existent headerVersionElement

This update helps diagnose potential display issues with the changelog
while making the script more resilient to missing elements and other
common failure scenarios.', '2025-05-10 02:57:42 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('6803966034753daeb7ac68a5e166a9d36cad9366', 'fix(ci): update GitHub Actions artifact and deployment versions

WHAT:
- Update actions/upload-pages-artifact from v1 to v2
- Update actions/deploy-pages from v2 to v3
- Add explicit path parameter for artifact upload
- Maintain workflow dependencies and execution order

WHY:
- Resolves "Missing download info" error in build-and-deploy job
- Ensures compatibility between GitHub Actions components
- Uses latest stable versions of GitHub''s deployment actions
- Aligns with current GitHub Pages deployment best practices

TECHNICAL:
- Specified explicit _site directory path for artifact upload
- Updated to newer GitHub Actions API versions
- Maintained existing workflow structure and dependencies
- Fixed configuration to ensure proper artifact handling

This change resolves the CI workflow error while preserving our
optimized build and version workflow pattern that prevents
redundant deployments.', '2025-05-10 03:00:00 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('19da504416d82fd0aebd26cd343533d19ed6114f', 'feat(ci): simplify version update workflow

WHAT:
- Create focused update-version-only.yml workflow that only updates version data
- Disable previous complex build-and-version.yml workflow
- Maintain commit message detection for preventing loops
- Add delay after version updates to ensure proper deployment sequence

WHY:
- Eliminates conflicts with GitHub''s built-in Pages deployment
- Creates cleaner separation of concerns in CI/CD pipeline
- Reduces complexity and potential failure points
- Lets each system do what it does best

TECHNICAL:
- Simplified workflow targets only version data generation
- Preserves loop prevention via commit message detection
- Maintains proper permissions for repository writes
- Adds brief delay to prevent race conditions between workflows

This simplification resolves CI workflow conflicts by letting GitHub''s
built-in Pages deployment handle the site building while our custom
workflow focuses exclusively on version data management.', '2025-05-10 03:06:04 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('5a1b1bc14ec53c69f54cf55e6aaba02fc350273b', 'fix(changelog): improve timeline script with debug logging

WHAT:
- Add console.log statements to pinpoint potential display issues
- Fix references to non-existent HTML elements in the version display
- Add debug output to version-data.js file loading
- Implement robust error handling for commit history display

WHY:
- Helps diagnose issues with commit timeline not displaying properly
- Makes browser console logs more informative for troubleshooting
- Prevents silent failures when elements aren''t found
- Maintains the clean visual design without adding debugging UI

These targeted changes should help identify exactly where the timeline
display might be failing while maintaining the existing interface.', '2025-05-10 03:13:25 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('f863c9321970e79f6100296a9a18a1d70b93fdd5', 'fix(changelog): filter out merge commits and improve timeline display

WHAT:
- Filter out "Merge branch" commits from the timeline display
- Add comprehensive console logging for debugging
- Fix references to non-existent HTML elements in version display
- Add cache-control meta tags to ensure fresh content
- Implement robust error handling for commit history display

WHY:
- Makes timeline more focused on meaningful changes rather than git mechanics
- Improves readability by removing redundant merge operations
- Ensures users always see the latest version information
- Prevents silent failures with detailed error reporting
- Makes browser console logs informative for troubleshooting

These changes create a cleaner, more readable changelog focused on
actual site improvements rather than version control mechanics,
while maintaining solid error handling and debug capabilities.', '2025-05-10 03:27:47 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('3f493ab38908ee7c08abd37bf9823f2069558fde', 'refactor: improve changelog with proper versioning and rename to "Development Ring"

WHAT:
- Excluded merge commits from incrementing the version number
- Excluded [skip ci] commits from incrementing the version number
- Added metadata to each commit to indicate if it''s a merge or skip-ci commit
- Improved error handling and performance with document fragments
- Renamed "The People''s Changelog" to "Development Ring" throughout
- Updated intro text and loading messages to match the new name
- Kept technical file names unchanged for compatibility

WHY:
- Creates a cleaner, more meaningful version history
- Improves changelog readability by filtering out git mechanics
- Reduces repetitive use of "The People''s" throughout the site
- Maintains the wrestling theme with a more fitting name
- Enhances UX by showing only significant version changes
- Prevents unnecessary version increments from CI/CD operations
- Better aligns with the "Development Ring" metaphor already in tagline

These changes result in a more focused version history that tracks actual
feature changes rather than git operations, while providing a clearer and
less repetitive branding approach.', '2025-05-10 03:51:05 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('a39f1e4974f4bb1206e823efdbf26f40026f4a0a', 'refactor: improve changelog with proper versioning and rename to " Development Ring\', '2025-05-10 03:56:04 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('f73c6a8aae8a1806211d08a6744a11549b9171e3', 'feat: improve version badge and rename "Changelog" to "Development Ring"

WHAT:
- Renamed "The People''s Changelog" to "Development Ring" throughout the site
- Enhanced version badge to display "BUILD X" instead of simple "vX" format
- Increased version badge width and improved styling for better visibility
- Made version-data.js more git-friendly with ISO dates and conflict guidance
- Improved JavaScript to consistently update all version number instances
- Added non-breaking space between "BUILD" and the number for proper display

WHY:
- Reduces repetitive use of "The People''s" throughout the site
- Creates a more informative version indicator that clearly shows build status
- Improves visual consistency with wrestling theme through gold/green styling
- Decreases likelihood of merge conflicts in version-data.js
- Ensures version numbers are properly displayed across all site elements
- Better aligns with the wrestling metaphor by highlighting the "Development Ring"

TECHNICAL:
- Increased version badge width to 120px to accommodate the full number
- Used white-space: nowrap to prevent text wrapping in the badge
- Added clear instructions in version-data.js for conflict resolution
- Updated setVersionNumber() function to handle all version elements
- Applied consistent styling to version indicators across the site
- Used ISO date format in generated files for better cross-environment consistency

These changes enhance both the visual presentation and technical robustness
of the version system while maintaining the wrestling theme that defines
the site''s unique personality.', '2025-05-10 04:05:09 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('d7873ab1a528f4bf1fc29aba4e539be7551c1a96', 'feat: improve version display and prevent merge conflicts

WHAT:
- Renamed "The People''s Changelog" to "Development Ring" throughout the site
- Enhanced version badge to display "BUILD X" with improved styling
- Increased version badge width and sizing for better visibility
- Added .gitattributes with merge strategy for version-data.js
- Made version script more git-friendly with ISO dates and conflict guidance
- Improved JavaScript to consistently update all version number instances

WHY:
- Reduces repetitive branding and creates a more fitting wrestling theme
- Provides a clearer, more informative version indicator on all pages
- Permanently solves the recurring merge conflicts with version-data.js
- Improves developer experience by automating conflict resolution
- Ensures version numbers are properly displayed across the site
- Creates a more maintainable codebase with better git integration

TECHNICAL:
- Added .gitattributes with merge=ours directive for version-data.js
- Increased version badge width to 120px with white-space: nowrap
- Used ISO date format in generated files for better consistency
- Updated version script with clear regeneration instructions
- Enhanced the setVersionNumber() function for better DOM handling
- Applied consistent styling to version badges site-wide

This comprehensive update improves both the user interface and the
development workflow while maintaining the wrestling theme that defines
the site''s unique personality.', '2025-05-10 04:06:54 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('2c3f7e07eb72c5bb4c8b3b7c43198b030618bffe', 'feat(timeline): enhance Development Ring with complete history and improved filtering

WHAT:
- Increased history limit from 20 to 100 commits to show complete site history
- Added aggressive filtering to remove noise commits from timeline display
- Standardized "BUILD" terminology throughout the site for consistency
- Fixed formatted issues in commit subject line for version 41
- Aligned version calculation with timeline display filtering
- Added detailed console logging for debugging timeline operations
- Created test script for validating commit filtering logic

WHY:
- Provides users with the complete development history from initial commit
- Removes distracting noise entries (version updates, merges) from timeline
- Creates a more consistent user experience with unified "BUILD" terminology
- Reduces version number to better reflect actual meaningful changes
- Makes the Development Ring more valuable and informative for visitors
- Respects users'' time and attention with focused, relevant history

TECHNICAL:
- Expanded getCommitHistory() limit from 20 to 100 commits in generate-version-data.js
- Added multi-stage filtering for version updates, merge commits and malformed entries
- Enhanced getCommitCount() to match display filtering rules for consistency
- Added formatting correction for problematic entries in timeline display
- Implemented console.log diagnostics for monitoring filtering operations
- Created standalone test-filtering.js script for validation without browser
- Changed "Version" to "BUILD" across HTML, JS display functions for consistency

These improvements create a cleaner, more meaningful history that truly represents
the development journey of The People''s Elbow from its inception to the present.', '2025-05-11 03:35:48 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('7bb3147074cbbed6fbc3cacb2fd067668251a4ae', 'fix(version): ensure build version 43 displays correctly with enhanced error handling

WHAT:
- Added immediate version setting before all other processing
- Enhanced version display with better error handling and visual feedback
- Added debugging information to verify version loading
- Implemented fallback retry mechanism if version isn''t set immediately
- Added detailed console logging throughout the version setting process

WHY:
- Fixes issue where the correct version number (43) wasn''t displaying on the site
- Provides better diagnostic information for troubleshooting
- Ensures version is set regardless of script execution timing issues
- Makes version updates visually apparent with a brief highlight effect
- Adds redundancy to ensure version always displays even if parts of script fail

TECHNICAL:
- Added early version setting call before timeline rendering
- Enhanced setVersionNumber() with improved error handling
- Added console logging at critical points in the script
- Implemented 100ms fallback retry for version setting
- Added visual flash effect when version number updates', '2025-05-11 14:54:59 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('49e702d1c42413cb6e6c0d561c5536fd84cd42da', 'fix(workflow): solve persistent version numbering lag by capturing current commit count

WHAT:
- Modified GitHub workflow to pre-count commits including the triggering commit
- Patched generate-version-data.js to recognize pre-counted commit values
- Added enhanced logging to verify correct version incrementation
- Fixed the frustrating "one version behind" display issue

WHY:
- Resolves persistent lag where version numbers are always one commit behind
- Ensures that each commit''s displayed version number includes itself
- Eliminates confusion between version numbers and commit history
- Provides more accurate development timeline for users
- Ends the day-long bug hunt that''s been affecting site reliability

TECHNICAL:
- Added pre-processing step to capture git rev-list --count HEAD before version generation
- Injected sed script to modify generate-version-data.js at runtime
- Created temporary .current-commit-count file for inter-step communication
- Added version number verification step to confirm fix is working
- Implemented runtime patching to avoid modifying source code directly

After a day of hunting, we''ve pinpointed the fundamental timing issue - the version
generator was only counting commits that existed BEFORE the triggering commit was made.
This small but crucial change ensures correct version numbering throughout the site.', '2025-05-11 15:06:42 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('53f0aa83c18ad9d787bd8dc524f09a242be3f9f1', 'fix(workflow): solve version lag by accurately counting current commit

WHAT:
- Completely redesigned the GitHub Actions version update workflow
- Created a dedicated fix-version.js script that forces correct version numbers
- Added direct commit counting to include the triggering commit
- Enhanced logging for better troubleshooting and verification
- Implemented proper error handling throughout the process

WHY:
- Fixes the frustrating "one version behind" bug that''s persisted in the site
- Ensures the Development Ring always shows accurate version numbers
- Makes sure each commit''s displayed version includes itself
- Eliminates confusion for users viewing the development timeline
- Provides a more reliable and robust build process

TECHNICAL:
- Added a two-step version generation process:
  1. Run standard version generator for commit data
  2. Override version number with precise git rev-list count
- Created a robust Node.js script with proper error handling
- Used regex matching to safely modify only the version number
- Added explicit commit count verification in logs
- Implemented clean separation of concerns between scripts

This fix tackles the fundamental timing issue where version generation
was happening before the triggering commit was counted. Now each commit
will properly increment the version number and be displayed correctly.', '2025-05-11 15:19:07 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('3624f2b8fe59984cdc39f12d08485e1a3a7c62a6', 'fix(workflow): correct version counting to use main branch commits only

WHAT:
- Modified GitHub workflow to count only commits on the main branch
- Fixed critical issue where all repository commits were being counted
- Changed git rev-list command to target main branch specifically
- Maintained all the robust error handling from previous workflow change

WHY:
- Corrects inflated version numbers (77 vs expected ~46)
- Ensures version numbers reflect meaningful project progress
- Aligns with existing filtering logic in the Development Ring
- Presents users with an accurate representation of site evolution
- Eliminates confusing version jumps caused by counting all branches

TECHNICAL:
- Changed git rev-list --count HEAD to git rev-list --count main in both places
- Kept all the robust JavaScript error handling for version updating
- Maintained the two-step generation process structure
- Fixed without altering the version correction technique
- Ensures consistent version counting throughout the workflow

This change fixes the unexpected version number jump and ensures
only commits on the main branch are counted for versioning purposes,
creating a more accurate and meaningful development timeline.', '2025-05-11 15:25:56 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('e14e2784c1dfd055e9638d549260736c78c86a35', 'refactor(version): complete overhaul of Development Ring version system

WHAT:
- Implemented a single source of truth for build versioning based on filtered, meaningful commits
- Rewrote generate-version-data.js with consistent filtering logic and improved error handling
- Simplified GitHub Actions workflow by removing redundant steps and version correction patches
- Updated changelog.js to better handle commit types and message formatting
- Added CI-LESSONS-PT2.md documenting our version system journey
- Enhanced JSON sanitization to prevent display issues with special characters
- Added more detailed logging throughout for easier troubleshooting

WHY:
- Fixes the persistent "one version behind" issue that affected the Development Ring
- Eliminates version number mismatches between global version and individual commits
- Creates a cleaner, more meaningful timeline by properly filtering noise commits
- Provides a more maintainable codebase by removing multiple patches and workarounds
- Improves the visitor experience with consistent build numbers and better type tagging
- Documents our learning process for future reference and knowledge sharing

TECHNICAL:
- Created isMeaningfulCommit() function as centralized filtering logic
- Established a consistent commit type system across both generator and display
- Uses a sequential numbering system based on filtered commit position
- Improved error handling with try/catch blocks and detailed logging
- Enhanced commit message display with structured formatting for WHAT/WHY/TECHNICAL sections
- Removed the fix-version.js script in favor of built-in filtering in the generator
- Maintained backward compatibility with existing version display elements

This completes the Development Ring overhaul, creating a more accurate and
maintainable version tracking system while preserving the wrestling-themed
presentation that makes The People''s Elbow unique.', '2025-05-12 00:12:24 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('9712dec1549806cd461f7f0131af14d7f9b0a2fe', 'fix(devring): align version display and restore timeline styling

WHAT:
- Fixed the global version number to match the highest build in timeline
- Restored original timeline styling while preserving filtering logic
- Added detection of duplicate version numbers to clean up display
- Enhanced expand/collapse functionality for commit details
- Updated CI-LESSONS-PT2.md with latest improvements

WHY:
- Ensures consistency between global version and timeline builds
- Improves visual presentation of the Development Ring
- Makes the timeline cleaner by preventing duplicate entries
- Creates a better user experience for viewing commit details
- Documents the solutions for future reference', '2025-05-16 01:59:34 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('9374700c2261d8d609773a72fc315d83e37c0d78', 'refactor(DevRing): Enhance timeline interactivity, styling, and data consistency

WHAT:
- Implemented an interactive, expandable/collapsible display for commit messages within the Development Ring timeline ([js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0)).
- Refined CSS styling (`css/changelog.css`) to support the new interactive features, including visual cues for expanded messages, hover effects, and distinct border colors based on commit types (`commit.shortType`).
- Improved the `generate-version-data.js` script to ensure more accurate version numbering by focusing on meaningful commits and enhancing the sanitization of commit messages for robust JSON output.
- Updated [js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0) to directly use `commit.commitType` and the new `commit.shortType` for consistent type display and styling, improving code clarity.
- Enhanced error handling and user feedback for scenarios where timeline data might fail to load.
- Successfully resolved merge conflicts that arose from integrating these features, ensuring the stability and correctness of the [js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0) script.

WHY:
- To provide a cleaner, more engaging, and user-friendly experience for viewing the project''s development history in the Development Ring.
- To ensure the versioning system accurately reflects significant development milestones and that the visual presentation of commits is clear and informative.
- To improve the maintainability and robustness of the changelog generation and display logic.

TECHNICAL:
- [js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0):
    - Added click event listeners to timeline items to toggle ''expanded'' and ''show'' CSS classes for message visibility.
    - Dynamically updated chevron icons (up/down) to indicate the toggle state of commit messages.
    - Leveraged `commit.shortType` (derived in `generate-version-data.js`) for applying specific CSS classes to timeline items for type-based styling.
    - Streamlined the assembly of timeline item DOM elements (`dateElement`, `versionElement`, `typeElement`, `contentWrapper`, `subjectElement`, `fullMessageElement`).
    - Implemented logic to display each version number only once unless it''s a version-incrementing commit, reducing redundancy in the timeline.
- `css/changelog.css`:
    - Added new styles for `.timeline-full-message`, `.message-toggle`, and `.expanded` states.
    - Refined existing styles for `.timeline-item` and commit type classes (e.g., `.feature`, `.fix`) to use borders for type differentiation.
- `generate-version-data.js`:
    - Adjusted commit filtering logic to better identify "meaningful" commits for version incrementation and timeline display.
    - Improved sanitization of commit messages to prevent issues with JSON parsing (e.g., handling special characters).
- Merge Conflict Resolution:
    - Carefully merged changes in [js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0) to preserve the interactive features from stashed work while integrating fixes from the branch.', '2025-05-21 04:23:05 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('05b8587d928ae608c612cd9f0e653c27f74a9920', 'feat(DevRing): Display timeline commits in descending order

WHAT:
- Modified [js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0) to reverse the array of commits before display.

WHY:
- To present the most recent development activities first on the changelog page, providing a more conventional and user-friendly experience.

TECHNICAL:
- Added `.reverse()` to the `meaningfulDisplayCommits` array within the `DOMContentLoaded` event listener in [js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0).', '2025-05-21 04:26:38 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('eba3729f766f215ebcb028a5f2318cce6dbae08b', 'fix(DevRing): Correct newline and section formatting in expanded commit messages

WHAT:
- Modified [js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0) to properly render full commit messages in the Development Ring timeline.
- Newline characters (`\\n`) are now converted to HTML `<br>` tags.
- Section headers (WHAT:, WHY:, TECHNICAL:) are now bolded for emphasis.

WHY:
- Previously, raw `\\n` characters were displayed in the expanded commit view, leading to poor readability.
- Section headers were not visually distinct, making it harder to parse the commit details.

TECHNICAL:
- In the [displayCommitHistory](cci:1://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:114:4-241:5) function:
    - Replaced the previous complex logic for `formattedDetailedMessage` with a more direct approach.
    - The commit body is now extracted by taking the full `commit.message` and removing the `commit.subject` part.
    - All `\\n` characters in the extracted body are replaced with `<br>`.
    - A regular expression (`/\\b(WHAT:|WHY:|TECHNICAL:)\\b/g`) is used to find and wrap the specified section headers with `<strong>` tags.
    - The `innerHTML` of `fullMessageElement` is set with this processed and formatted body.', '2025-05-21 13:59:56 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('dd41b21395fe14ba1991e4473eea6fdf0049c57b', 'fix(DevRing): Correctly parse escaped newlines in commit messages

WHAT:
- Updated [js/changelog.js](cci:7://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:0:0-0:0) to replace literal ''\\\\n'' sequences (escaped newlines from JSON) with HTML `<br>` tags in the expanded commit message view.

WHY:
- Commit messages, when stringified to JSON in `generate-version-data.js` and then parsed, retained ''\\\\n'' as literal characters instead of being interpreted as newlines. This caused them to display incorrectly in the timeline.

TECHNICAL:
- Modified the regular expressions in [displayCommitHistory](cci:1://file:///c:/Users/alexa/Desktop/peoples-elbow%20site/Repo/peoples-elbow/js/changelog.js:114:4-242:5) function to search for and replace `\\\\n` (a literal backslash followed by ''n'') instead of `\\n` (a single newline character).
- Adjusted the logic for removing leading newlines to also target `\\\\n`.', '2025-05-21 14:03:21 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('cd82e9e3879e02312d4a1c107c646630413fda58', 'feat(DevRing): Enhance timeline interactivity, formatting, and adopt feature branching

WHAT:
- Implemented descending order for timeline commits (newest first).
- Added interactive, expandable/collapsible display for full commit messages.
- Corrected newline formatting in expanded commit messages (both `\n` and `\\n` issues resolved).
- Ensured section headers (WHAT:, WHY:, TECHNICAL:) within commit messages are bolded.
- Improved visual styling with chevron icons for toggle states and distinct border colors based on commit types.
- Successfully resolved merge conflicts in `js/version-data.js` by regenerating the file.
- Adopted feature branching and Pull Requests as the standard workflow for future development with this PR.

WHY:
- To present the most recent development activities first, aligning with common changelog conventions.
- To provide a cleaner, more engaging, and user-friendly experience for viewing project history.
- To ensure accurate and readable display of detailed commit information.
- To improve the maintainability and robustness of the changelog system.
- To formalize a more stable and collaborative development branching strategy, enhancing code quality and review processes.

TECHNICAL:
- `js/changelog.js`:
    - Added `.reverse()` to `meaningfulDisplayCommits` array.
    - Implemented click event listeners for toggling message visibility and icon states.
    - Refined logic to parse and display commit messages, replacing `\\n` with `<br>` and bolding section headers.
- `js/version-data.js`:
    - Resolved merge conflict by locally merging `main` into `fix/devring-version-consistency`, re-running `node generate-version-data.js`, and committing the result.
- Workflow: This set of changes was developed on the `fix/devring-version-consistency` feature branch and integrated via Pull Request, establishing this as the new standard procedure.', '2025-05-21 14:49:12 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('e89b504a8cb9da86e79a6d8d67b355ae4c2c3cb3', 'refactor: remove array reversal and maintain oldest-to-newest commit order', '2025-05-21 22:29:19 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('c1f90c4e110ee446cf8607610e3968b4be0954fb', 'feat: Implement custom Git merge driver for js/version-data.js

WHAT:
- Introduced a .gitattributes file to designate a custom merge strategy named ''generated'' for the ''js/version-data.js'' path.
- Configured the ''generated'' merge driver (locally for now) to automatically execute ''node generate-version-data.js && git add js/version-data.js'' upon encountering a merge conflict on this file.

WHY:
- The ''js/version-data.js'' file, being auto-generated from Git history, is a common point of merge conflicts when integrating changes from different branches (e.g., merging ''main'' into a feature branch).
- Resolving these conflicts manually by regenerating the file and staging it is a repetitive and potentially error-prone step in the development workflow.
- This custom merge driver automates this specific conflict resolution, ensuring ''js/version-data.js'' is always correctly rebuilt according to the combined commit history post-merge.
- This enhancement aims to streamline the development process, reduce manual toil, and maintain the integrity of the version data during branch integrations.

TECHNICAL:
- The .gitattributes file now contains ''js/version-data.js merge=generated''.
- The local Git configuration for the driver involves:
  - `git config --local merge.generated.name "Regenerate version-data.js"`
  - `git config --local merge.generated.driver "node generate-version-data.js && git add js/version-data.js"`
- This setup leverages Git''s custom merge driver capability. When a merge operation triggers a conflict on the specified file, Git will invoke the defined driver command.
- For this automation to be effective for all collaborators, they would need to apply the same `git config --local merge.generated.*` settings in their respective local repositories. Consideration should be given to documenting this setup step (e.g., in a CONTRIBUTING.md).', '2025-05-22 03:25:11 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('1004062a13e169eea7d41c27ee7b255d43935881', 'docs: Document local configuration for js/version-data.js merge driver

WHAT:
- Added a new section to README.md explaining the custom Git merge driver for ''js/version-data.js''.
- Provided the necessary `git config --local` commands that collaborators or users on new clones need to run to enable the automated conflict resolution.

WHY:
- The custom merge driver relies on local Git configuration to execute the ''node generate-version-data.js'' script.
- This documentation ensures that anyone working on the project can set up their environment to benefit from the automated conflict resolution for ''js/version-data.js'', improving workflow consistency.', '2025-05-22 03:34:53 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('80b9490ca1567d92e6d1fcb7f802b0178764a153', 'fix: Add .nojekyll to prevent Jekyll processing on GitHub Pages', '2025-05-22 21:51:52 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('701206943d58859efd9fa602832a5610fb0bfb76', 'fix: Replace separate workflows with unified build-deploy pipeline to prevent race conditions', '2025-05-22 21:57:14 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('8d521f6bddafd0f732405b6440d1f8e6a215e06d', 'fix: Reverse changelog order to show newest commits first', '2025-05-22 22:04:16 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('335a6ec1460867d66b68b32d493a7f07eb0ec811', 'fix: Update GitHub Actions versions to resolve deployment error', '2025-05-22 22:07:13 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('1dc777289efeccfdc7e7dfd6f96a83ee1b34ef11', 'fix: Ensure deploy job pulls latest version updates before deploying

WHAT:
Added a git pull step to the deploy job in the GitHub Actions workflow to ensure it always has the latest version-data.js changes from the update-version job before deploying to GitHub Pages.

WHY:
The deployment was using a stale version of version-data.js because the checkout action in the deploy job was retrieving the repository state from before the update-version job pushed its changes. This caused the live site to always be one version behind.

TECHNICAL:
- Added fetch-depth: 0 to the checkout action to get full history
- Added explicit "git pull origin main --rebase" step after checkout
- Added debug logging to show the latest commit and version number being deployed
- This ensures the deploy job always has the version update commit that was just pushed by the previous job', '2025-05-22 22:17:23 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('6ed86b57ad2bca01c8fe67ea72f94b207beeae5b', 'fix: Add deployment debugging and force rebuild mechanism

WHAT:
Added comprehensive debugging steps to the deploy workflow to show exactly what version is being deployed, plus a timestamp file to force GitHub Pages to recognize changes and rebuild.

WHY:
The deployment is still showing version 41 on the live site even though the GitHub repository has version 42. We need visibility into what''s actually being deployed and a way to force GitHub Pages to rebuild from scratch.

TECHNICAL:
- Added "Verify version before deployment" step that shows:
  - Current git status and latest commits
  - The actual version number in js/version-data.js
  - File contents and modification time
- Added "Force rebuild with timestamp" step that creates a .last-deploy file with:
  - Deployment timestamp
  - Version number being deployed
  - Commit SHA being deployed
- This file changes on every deploy, forcing GitHub Pages to recognize the deployment as new', '2025-05-22 22:26:49 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('43624c23b629d78f502292fe02503f2ebc1292af', 'fix: Add cache-busting to changelog page for version-data.js

WHAT:
Modified changelog.html to dynamically load version-data.js with a timestamp parameter, forcing browsers and CDNs to fetch the latest version instead of using cached copies.

WHY:
The live site was showing version 42 in the actual version-data.js file, but the changelog page was still displaying old data due to browser/CDN caching of the JavaScript file. Even though GitHub Pages had the correct file, browsers were not refreshing it.

TECHNICAL:
- Replaced static script tag with dynamic JavaScript that appends timestamp to version-data.js URL
- Ensured changelog.js loads only after version-data.js is fully loaded using onload event
- This forces a fresh fetch of version-data.js on every page load, bypassing all caches', '2025-05-22 22:31:54 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('e5ca8042f2703cafc7dc88f08e41b6aef6bb7bcf', 'fix: Force deploy job to checkout latest commit from version update

WHAT:
Modified the deploy workflow to explicitly fetch and checkout the latest commit from origin/main after the version update job completes. Also removed duplicate DOMContentLoaded handler in changelog.html that was causing the timeline to stall.

WHY:
GitHub Actions was checking out the triggering commit for the deploy job, not the new commit created by the update-version job. This caused a persistent -1 version lag where the deployed version was always one behind. The duplicate JavaScript was also preventing the timeline from loading properly.

TECHNICAL:
- Changed deploy job to fetch origin/main and checkout origin/main explicitly
- This ensures we get the version update commit that was just pushed
- Removed redundant version check script from changelog.html that was interfering with changelog.js
- Added debug output to show HEAD commit before and after the checkout', '2025-05-22 22:41:29 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('b0ac15237b01d852b25e16759f0c86a0df5516fd', 'fix: Simplify cache busting and ensure deploy uses latest commit

WHAT:
1. Fixed deploy workflow to explicitly checkout origin/main after version update
2. Simplified cache busting in changelog.html using document.write with timestamps
3. Removed complex async script loading that was preventing timeline from loading

WHY:
The deploy job was still deploying the old commit, not the new one with the updated version. The complex async script loading was causing the changelog.js DOMContentLoaded event to never fire, leaving the page stuck on "Loading..."

TECHNICAL:
- Deploy job now fetches and checks out origin/main to get the version update commit
- Cache busting uses simple document.write with timestamp query parameters
- This ensures scripts load synchronously in the correct order
- Changelog.js can now properly initialize when DOM is ready', '2025-05-22 22:44:26 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('76cee8cac75fab0eb410f87a2fc3380b0727e486', 'fix: Regenerate version-data.js during deploy to include triggering commit

WHAT:
Added a step in the deploy workflow to regenerate version-data.js after checking out the latest code, ensuring the triggering commit is included in the changelog. Also added cache busting to index.html.

WHY:
The persistent -1 version lag was caused by the workflow generating version-data.js before the triggering commit was fully processed. The deploy job was getting the right version number but the commit history was missing the latest commit.

TECHNICAL:
- Deploy job now regenerates version-data.js after checking out origin/main
- This ensures the commit that triggered the workflow is included in the history
- Added cache busting to index.html to match changelog.html
- The regeneration happens right before deployment, capturing the complete state', '2025-05-22 22:49:14 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('a980b55655d5e5bb5cc2ab33c446e31bfe71cfbc', 'fix: Remove automatic version commits to solve persistent -1 lag

WHAT:
Commented out the update-version job and moved version generation directly into the deploy job. The deploy job now regenerates version-data.js fresh during deployment instead of relying on automated commits.

WHY:
The automatic "Update version data" commits were creating a persistent -1 lag. When you pushed a meaningful commit, the workflow would create a version update commit AFTER it, making your commit the second-to-last instead of the latest. The deploy job would then deploy the version update commit''s state, which didn''t include your commit in the timeline.

TECHNICAL:
- Disabled the update-version job entirely to stop automatic commits
- Deploy job now runs directly on push without waiting for version updates
- Added Node.js setup and version-data.js regeneration to deploy job
- Version data is generated fresh during deployment, ensuring all commits are included
- No more [skip ci] commits cluttering the git history', '2025-05-22 22:53:21 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('3d46a79d2928deab4a1cfa72acda72cd905dbf94', 'fix: Use HEAD instead of main to capture current commit in version data

WHAT:
Modified generate-version-data.js to use HEAD instead of main branch when counting commits and generating history. This ensures the current commit is included when the script runs during deployment.

WHY:
The persistent -1 version lag was caused by git commands targeting ''main'' branch which might not include the current commit during GitHub Actions workflow execution. Using HEAD ensures we capture the exact state at the time of generation.

TECHNICAL:
- Changed git rev-list main to git rev-list HEAD
- Changed git log commands to target HEAD instead of main
- This ensures the triggering commit is included in both version count and history', '2025-05-23 00:03:41 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('b60c7b4ea206c4631e4233ae5b6b5d10be4eba39', 'fix: Remove origin/main checkout to use triggering commit HEAD

WHAT:
Removed the git fetch and checkout origin/main commands from the deploy workflow. The workflow now uses the HEAD commit that triggered it directly.

WHY:
The workflow was checking out origin/main which might not include the commit that triggered the deployment, causing the persistent -1 version lag. By using the current HEAD, we ensure the triggering commit is included in the version count.

TECHNICAL:
- Removed git fetch origin main and git checkout origin/main
- Workflow now operates on the exact commit that triggered it
- This ensures generate-version-data.js counts the triggering commit when using HEAD', '2025-05-23 01:13:45 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('fec9aa6d918244754c53ff4693ed8ce65863a872', 'fix: Remove git add to keep regenerated version-data.js in working directory

WHAT:
Removed the `git add js/version-data.js` command after regenerating the version data file during deployment.

WHY:
The upload-pages-artifact action uploads files from the working directory, not from git''s staging area. By staging the regenerated file with `git add`, we were preventing the updated version from being included in the deployment artifact. This caused the deployed site to show the old version despite generating the correct one.

TECHNICAL:
- Regenerated version-data.js now remains in the working directory
- Upload artifact captures the actual regenerated file content
- This ensures the deployed site gets the freshly generated version data', '2025-05-23 01:19:06 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('fddd498f6b360ea3c56111635b3225266c7bd55f', 'fix: Disable merge driver that was overwriting regenerated version data

WHAT:
Commented out the custom merge driver for js/version-data.js in .gitattributes.

WHY:
The custom merge driver was being triggered during the GitHub Actions checkout process, causing it to regenerate version-data.js based on the checked-out state (without the triggering commit). This overwrote our correctly regenerated version data that included all commits.

TECHNICAL:
- Workflow regenerated version 52 correctly
- Post-checkout hooks triggered the merge driver
- Merge driver regenerated based on checked-out state (version 51)
- Deployed artifact contained the overwritten version 51
- Disabling the merge driver prevents this overwrite', '2025-05-23 01:27:39 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('0f718b466d7f4217fcb0ad01f4435d6215c7b520', 'fix: Explicitly unset merge driver config in workflow

WHAT:
Added a step to explicitly unset the git merge driver configuration after checkout in the deploy workflow.

WHY:
Even though we disabled the merge driver in .gitattributes, the git configuration for the merge driver was still active in the GitHub Actions environment. This caused the checkout process to apply the merge driver, regenerating version-data.js based on the checked-out state and overwriting our correctly generated version.

TECHNICAL:
- Unsets merge.generated.driver and merge.generated.name git configs
- Uses || true to prevent errors if configs don''t exist
- Ensures no merge driver interference during deployment', '2025-05-23 01:36:18 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('c9c027cfce4097f89401ac2041c6050defe50503', 'feat: Simplify deploy workflow to fix version lag

WHAT:
Completely rewrote the deploy workflow to be minimal and straightforward. Removed all complex git operations, merge driver handling, and debug steps.

WHY:
The previous workflow had accumulated too many patches trying to fix the version lag issue. Starting fresh with a simple approach eliminates all the complexity that was causing interference.

TECHNICAL:
- Single job that just generates and deploys
- No git operations beyond initial checkout
- No merge driver configuration to interfere
- Fresh version data generated directly before upload', '2025-05-23 01:38:46 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('c2aa6ae7a3aea89f020f458af47996b908a50619', 'feat: Rebuild changelog system from scratch with new approach

WHAT:
Created a completely new changelog system independent of the problematic version-data.js approach. Added generate-changelog.js to create changelog-data.json, created devring.html as a new changelog display page, and updated the deployment workflow to generate both data files.

WHY:
The existing changelog system had persistent version lag issues due to complex interactions between git merge drivers, GitHub Actions checkout process, and the version-data.js generation. Multiple attempts to fix the existing system failed. A clean rebuild eliminates all the accumulated complexity and provides a simple, debuggable solution.

TECHNICAL:
- generate-changelog.js creates js/changelog-data.json with commit history
- Uses simple git log with ~~~ delimiter to avoid parsing issues
- devring.html loads JSON directly with cache busting (?t=timestamp)
- No dependencies on version-data.js or merge drivers
- Workflow generates both files for backward compatibility
- Clean JSON structure: version, hash, date, subject, author
- Filters out [skip ci] and auto-generated commits', '2025-05-23 02:23:30 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('f9faa637c8a62bfad69da39057fef5363b4ceb64', 'fix: Update changelog link to new devring page

WHAT:
Changed the version badge link from changelog.html to devring.html.

WHY:
The new changelog system uses devring.html instead of the old changelog.html page.

TECHNICAL:
- Simple href update in index.html
- Points to the new changelog implementation', '2025-05-23 02:28:50 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('659d9cd59757b5aaec4c6373ca2621a81a994d56', 'fix: Correct version numbering and timestamp display in changelog

WHAT:
Fixed the changelog generator to properly number versions starting from 1 for the oldest commit, and updated the devring page to show "X minutes ago" instead of absolute timestamps.

WHY:
The version numbers were incorrect (showing v61 for initial commit) because we were counting all commits but only displaying filtered ones. The timestamp was confusing showing UTC time that appeared to be in the past.

TECHNICAL:
- Filter commits first, then assign sequential version numbers
- Version 1 = oldest meaningful commit, latest = highest number
- Display generated time as "X minutes ago" for better UX
- Removes confusion about timezone differences', '2025-05-23 02:41:22 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('80ffad6ba6d0b25d97bab9d5fc31e91c5c06dc13', 'fix: Add changelog-data.json to git tracking for GitHub Pages deployment

WHAT:
Added the generated js/changelog-data.json file to git tracking so it will be included in GitHub Pages deployments.

WHY:
GitHub Pages'' upload-pages-artifact action only deploys files that are tracked in git. Files generated during the workflow but not committed aren''t included in the deployment. This is why version-data.js works (it''s tracked) but the dynamically generated changelog-data.json wasn''t appearing on the live site.

TECHNICAL:
- Added js/changelog-data.json to git (similar to version-data.js)
- File contains the current changelog with proper version numbering
- Workflow will regenerate it on each deploy, updating the tracked file
- This matches the pattern used by version-data.js', '2025-05-23 02:49:56 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('2748f5a8f97c517920bd8ec23592c7db2b2b9590', 'fix: Regenerate changelog data during workflow to include triggering commit

WHAT:
Updated the deployment workflow to regenerate changelog-data.json after checkout, ensuring it includes the commit that triggered the workflow.

WHY:
The committed changelog-data.json file is always one commit behind because it''s generated before the commit that adds/updates it. This causes the same -1 version lag we experienced with version-data.js.

TECHNICAL:
- Generate fresh changelog data after checkout in workflow
- This ensures the triggering commit is included
- Similar to how version-data.js is regenerated
- Adds debugging output to verify correct generation', '2025-05-23 02:54:11 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('1c10212d5de7615030eb0d864d0bf512a00573e5', 'fix: Add verification step to debug changelog deployment issue

WHAT:
Added a verification step in the workflow to check if generated files exist and contain fresh data before uploading to GitHub Pages.

WHY:
The changelog is being regenerated correctly during the workflow (showing 79 commits) but the live site still shows old data from 6:44 AM. We need to verify the files are present and updated before the upload-pages-artifact step.

TECHNICAL:
- Lists file details for both version-data.js and changelog-data.json
- Shows first 5 lines of each file
- Displays the generated timestamp from changelog
- Helps debug why fresh data isn''t being deployed', '2025-05-23 03:01:07 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('1b9900174abb1ad80731cfaaffcbb130375d7827', 'fix: Commit generated files during workflow to include in deployment

WHAT:
Added a temporary commit step in the workflow to ensure generated files are included in the GitHub Pages deployment.

WHY:
The upload-pages-artifact action uses git''s tracked file state, not the working directory. Even though we were generating fresh changelog-data.json (with current timestamps), it wasn''t being deployed because the action was using the committed version of the file, not the freshly generated one.

TECHNICAL:
- Creates temporary commit with generated files before artifact upload
- Uses [skip ci] to prevent triggering another workflow
- This ensures upload-pages-artifact includes the fresh data
- Similar issue to why version-data.js updates weren''t deploying', '2025-05-23 03:04:20 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('2e6438b5cc87fc81247cf03268b2998835f0d05d', 'feat: Prepare site for event with Convention of Tension Prevention branding

WHAT:
- Hidden devring link temporarily for cleaner presentation
- Added "Fighting the Forces of Tension" subtitle to hero section
- Rebranded host section as "Join the Convention of Tension Prevention"
- Enhanced mission text with Convention narrative
- Changed primary CTA from "Host an Event" to "Join the Convention"

WHY:
- Site visitors at tomorrow''s event should see polished, thematic content
- Convention of Tension Prevention branding reinforces the mutual aid model
- Playful wrestling narrative makes the service more approachable
- Hidden devring keeps focus on main content for new visitors

TECHNICAL:
- Commented out version badge div in index.html
- Added hero-subtitle CSS class with gold color and text shadow
- Updated section headings and body text with new branding
- Maintained all existing functionality while enhancing presentation', '2025-05-24 03:45:40 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('2840d90ac7b0e7b84ed7b59708c13e76711c9179', 'feat: Add visual polish and Convention branding for event launch

WHAT:
- Hidden devring temporarily for cleaner visitor experience
- Added animated impact counters with pulsing "?" placeholders
- Created interactive tension meter showing progress from HIGH to DEFEATED
- Enhanced map placeholder with gradient background and bouncing icon
- Implemented Convention of Tension Prevention branding throughout
- Added "Fighting the Forces of Tension" hero subtitle

WHY:
- Tomorrow''s event needs polished, engaging visuals for first impressions
- Animated elements create energy and anticipation for the launch
- Convention branding reinforces the mutual aid community narrative
- Visual enhancements make the site more memorable and shareable

TECHNICAL:
- Added pe-green-dark CSS variable for gradient effects
- Implemented multiple CSS animations (pulse, bounce, fillMeter, rotate)
- Updated HTML structure for tension meter and enhanced placeholders
- Used CSS transforms and keyframes for smooth animations
- Maintained responsive design for all new elements', '2025-05-24 03:53:33 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('9765aa6a9971b930ad3b9ed4680a504854f24280', 'feat: Add subtle animations and Convention branding for event

WHAT:
- Hidden devring temporarily for cleaner visitor experience
- Added animated impact counters with limited pulsing "?" placeholders
- Enhanced map placeholder with gradient and subtle animations
- Implemented Convention of Tension Prevention branding throughout
- Added "Fighting the Forces of Tension" hero subtitle

WHY:
- Tomorrow''s event needs polished visuals without being distracting
- Limited animations create initial interest then settle down
- Convention branding reinforces the mutual aid narrative
- Professional appearance builds trust with new visitors

TECHNICAL:
- Limited animations to 3 iterations (pulse, bounce) or 1 (rotate)
- Added pe-green-dark CSS variable for gradients
- Updated HTML structure for enhanced placeholders
- Maintained responsive design for all elements', '2025-05-24 03:56:47 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('81f9a7f6fa79447e28e038c0f835075ab9c5a164', 'fix: tone down animations', '2025-05-24 03:58:53 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('0247d68429aec160caccca6e380364e925287096', 'fix: disable stat numbers', '2025-05-24 04:00:45 -0400', 'degenai', '106579309+degenai@users.noreply.github.com');
