# Universal Header/Footer Component System

## Overview

This system allows you to maintain a single header and footer that can be used across all pages of The People's Elbow website. It's designed to work seamlessly with your Cloudflare + GitHub Pages setup.

## Files Created

- `components/header.html` - Universal header component
- `components/footer.html` - Universal footer component  
- `js/components.js` - JavaScript component loader

## How to Use

### For New Pages

1. Copy an existing simple page (e.g. `book.html`) and rename it
2. Update the title, meta description, and page content
3. The header and footer will automatically load

### For Existing Pages

Replace your existing header and footer HTML with:

```html
<!-- Universal Header Component -->
<div id="header-placeholder"></div>

<!-- Your page content here -->

<!-- Universal Footer Component -->
<div id="footer-placeholder"></div>
```

Make sure to include the component loader script:

```html
<script src="js/components.js"></script>
```

## Features

- **Automatic Navigation Highlighting**: Current page is automatically highlighted in navigation
- **Caching**: Components are cached after first load for better performance
- **Error Handling**: Graceful fallback if components fail to load
- **Mobile Menu Integration**: Works with existing mobile menu functionality
- **Version Badge Integration**: Maintains existing version display functionality

## Navigation Data Attributes

The system uses `data-nav` attributes to identify pages for highlighting. The current header nav carries `data-nav` items for the index sections (`mission`, `services`, `host`, `impact`, `locations`, `contact`) plus `past-events`, `book`, and `steal-this-site`. The page map in `js/components.js` also recognizes `calendar.html`, `chat.html`, and `changelog.html`, but those pages are not currently in the header nav, so no highlighting applies to them.

## Making Changes

### To Update Header or Footer

1. Edit `components/header.html` or `components/footer.html`
2. Changes will automatically appear on all pages using the system
3. No need to update individual pages

### To Add New Navigation Items

1. Edit `components/header.html`
2. Add appropriate `data-nav` attribute
3. Update the page mapping in `js/components.js` if needed

## Compatibility

- Works with your existing Cloudflare Workers and D1 database setup
- Compatible with GitHub Pages static hosting
- Maintains all existing JavaScript functionality
- Mobile-responsive navigation preserved

## Converted Pages

All site pages now use the universal component system:
- ✅ `index.html` - Homepage
- ✅ `book.html` - Booking page
- ✅ `calendar.html` - Calendar page (not currently in the nav)
- ✅ `chat.html` - Chat page (not currently in the nav)
- ✅ `past-events.html` - Past appearances
- ✅ `steal-this-site.html` - Documentation page
- ✅ `changelog.html` - Development log
- ✅ `crm.html` - Lead-o-Tron CRM
- ✅ `privacy.html` - Privacy policy
- ✅ `brand-kit.html` - Brand kit
- ✅ `404.html` - Error page
- 🗑️ `dashboard.html` - retired to `_deprecated/` (replaced by `crm.html`, the Lead-o-Tron v2)

## Troubleshooting

- Components load via fetch(), so pages must be served via HTTP(S)
- Check browser console for any component loading errors
- Ensure `components/` directory is accessible from your web root
- The system gracefully handles missing components without breaking the page 