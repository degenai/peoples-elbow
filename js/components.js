/**
 * Universal Header/Footer Component System
 * For The People's Elbow website
 * Compatible with Cloudflare + GitHub Pages setup
 */

class ComponentLoader {
    constructor() {
        this.loadedComponents = new Map();
        this.currentPage = this.getCurrentPageIdentifier();
    }

    /**
     * Sanitize trusted header/footer component HTML before injecting it.
     *
     * DOMPurify is still used when available, but the site header must not depend
     * on a remote CDN module loading perfectly. If DOMPurify is unavailable, use
     * a small local allow-list sanitizer for these first-party component fragments.
     */
    async sanitizeHTML(html) {
        if (!html) return '';

        if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
            return window.DOMPurify.sanitize(html);
        }

        try {
            const purify = await import('https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.es.mjs');
            const domPurify = purify.default || purify;
            if (domPurify && typeof domPurify.sanitize === 'function') {
                window.DOMPurify = domPurify;
                return domPurify.sanitize(html);
            }
        } catch (error) {
            console.warn('DOMPurify unavailable; using local component sanitizer:', error);
        }

        return this.sanitizeTrustedComponentHTML(html);
    }

    sanitizeTrustedComponentHTML(html) {
        const allowedTags = new Set([
            'a', 'button', 'div', 'footer', 'header', 'i', 'img', 'li',
            'nav', 'p', 'span', 'ul'
        ]);
        const allowedAttributes = new Set([
            'alt', 'aria-expanded', 'aria-hidden', 'aria-label', 'class',
            'data-nav', 'href', 'id', 'rel', 'src', 'style', 'target'
        ]);
        const removableTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template']);
        const template = document.createElement('template');
        template.innerHTML = html;

        const isSafeUrl = (value, attributeName) => {
            const trimmed = (value || '').trim();
            if (!trimmed) return true;
            if (trimmed.startsWith('#')) return true;
            try {
                const parsed = new URL(trimmed, window.location.origin);
                if (attributeName === 'src') {
                    return ['http:', 'https:'].includes(parsed.protocol);
                }
                return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
            } catch (error) {
                return false;
            }
        };

        const isSafeStyle = (value) => {
            const lowered = (value || '').toLowerCase();
            return !/(expression|javascript:|url\s*\(|@import|<|>)/.test(lowered);
        };

        const scrub = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();
                if (removableTags.has(tag)) {
                    node.remove();
                    return;
                }
                if (!allowedTags.has(tag)) {
                    node.replaceWith(...Array.from(node.childNodes));
                    return;
                }

                Array.from(node.attributes).forEach((attribute) => {
                    const name = attribute.name.toLowerCase();
                    const value = attribute.value;
                    if (name.startsWith('on') || !allowedAttributes.has(name)) {
                        node.removeAttribute(attribute.name);
                    } else if ((name === 'href' || name === 'src') && !isSafeUrl(value, name)) {
                        node.removeAttribute(attribute.name);
                    } else if (name === 'style' && !isSafeStyle(value)) {
                        node.removeAttribute(attribute.name);
                    }
                });
            }

            Array.from(node.childNodes).forEach(scrub);
        };

        Array.from(template.content.childNodes).forEach(scrub);
        return template.innerHTML;
    }

    /**
     * Get current page identifier for navigation highlighting
     */
    getCurrentPageIdentifier() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        // Map filenames to nav identifiers
        const pageMap = {
            'index.html': 'home',
            '': 'home',
            'calendar.html': 'calendar',
            'chat.html': 'chat',
            'changelog.html': 'changelog',
            'steal-this-site.html': 'steal-this-site'
        };
        
        return pageMap[filename] || filename.replace('.html', '');
    }

    /**
     * Load a component from the components directory
     */
    async loadComponent(componentName) {
        if (this.loadedComponents.has(componentName)) {
            return this.loadedComponents.get(componentName);
        }

        try {
            const response = await fetch(`components/${componentName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentName}`);
            }
            const html = await response.text();
            this.loadedComponents.set(componentName, html);
            return html;
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            return null;
        }
    }

    /**
     * Inject header component
     */
    async loadHeader(targetSelector = '#header-placeholder') {
        const headerHtml = await this.loadComponent('header');
        if (!headerHtml) return false;

        const targetElement = document.querySelector(targetSelector);
        if (!targetElement) {
            console.error(`Header target element not found: ${targetSelector}`);
            return false;
        }

        targetElement.innerHTML = await this.sanitizeHTML(headerHtml);
        this.highlightCurrentPage();
        return true;
    }

    /**
     * Inject footer component
     */
    async loadFooter(targetSelector = '#footer-placeholder') {
        const footerHtml = await this.loadComponent('footer');
        if (!footerHtml) return false;

        const targetElement = document.querySelector(targetSelector);
        if (!targetElement) {
            console.error(`Footer target element not found: ${targetSelector}`);
            return false;
        }

        targetElement.innerHTML = await this.sanitizeHTML(footerHtml);
        return true;
    }

    /**
     * Highlight current page in navigation
     */
    highlightCurrentPage() {
        // Remove any existing active classes
        document.querySelectorAll('nav a.active').forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current page
        document.querySelector(`nav a[data-nav="${this.currentPage}"]`)?.classList.add('active');

        // Special handling for home page sections
        const hash = window.location.hash;
        if (this.currentPage === 'home' && hash) {
            document.querySelector(`nav a[href="index.html${hash}"]`)?.classList.add('active');
        }
    }

    /**
     * Load all components
     */
    async loadAllComponents() {
        const promises = [
            this.loadHeader(),
            this.loadFooter()
        ];

        const results = await Promise.all(promises);
        const success = results.every(result => result === true);
        
        if (success) {
            // All components loaded successfully
            this.initializeComponentFeatures();
        } else {
            console.error('Some components failed to load');
        }

        return success;
    }

    /**
     * Initialize features that depend on components being loaded
     */
    initializeComponentFeatures() {
        // Initialize version number update after header is loaded
        this.initializeVersionNumber();

        // Initialize mobile menu after header component is injected
        this.initializeMobileMenu();
    }

    /**
     * Get the current site version, using caching to prevent duplicate requests
     */
    async getVersion() {
        // 1. Check in-memory cache
        if (this._versionCache !== undefined) {
            return this._versionCache;
        }

        // 2. Check if a fetch is already in progress
        if (this._versionPromise) {
            return this._versionPromise;
        }

        // 3. Check sessionStorage
        try {
            const storedVersion = sessionStorage.getItem('site_version');
            if (storedVersion) {
                const version = parseInt(storedVersion, 10);
                if (!isNaN(version)) {
                    this._versionCache = version;
                    return version;
                }
            }
        } catch (e) {
            // Ignore sessionStorage errors (e.g., in incognito mode)
        }

        // 4. Fetch from API
        this._versionPromise = (async () => {
            try {
                const response = await fetch('https://changelog-reader.alex-adamczyk.workers.dev?limit=1&offset=0');
                const data = await response.json();

                if (data.success && data.pagination && data.pagination.total) {
                    const version = data.pagination.total;
                    this._versionCache = version;

                    try {
                        sessionStorage.setItem('site_version', version);
                    } catch (e) {
                        // Ignore sessionStorage errors
                    }

                    return version;
                } else {
                    throw new Error('Invalid D1 response format');
                }
            } finally {
                this._versionPromise = null;
            }
        })();

        return this._versionPromise;
    }

    /**
     * Initialize version number display
     */
    async initializeVersionNumber() {
        const headerVersionElement = document.getElementById('header-version-number');
        if (!headerVersionElement) return;
        
        const badge = document.getElementById('version-badge');
        const reveal = () => { if (badge) badge.classList.remove('version-badge--pending'); };

        try {
            const version = await this.getVersion();
            headerVersionElement.textContent = version;
            reveal();

            // Header version updated from D1 database
        } catch (error) {
            console.warn('Failed to fetch D1 version:', error);
            // Don't fall back to incorrect local data - show error state instead
            headerVersionElement.textContent = '?';
            headerVersionElement.style.opacity = '0.6';
            reveal();
                            // Header version showing error state due to D1 API failure
        }
    }

    /**
     * Initialize mobile menu functionality
     */
    initializeMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('nav ul');
        
        if (menuToggle && navMenu) {
            // Remove any existing listeners to avoid duplicates
            menuToggle.removeEventListener('click', this.menuToggleHandler);
            
            // Store handler reference for cleanup
            this.menuToggleHandler = function() {
                const isOpen = navMenu.classList.toggle('mobile-menu-active');
                menuToggle.setAttribute('aria-expanded', String(isOpen));
            };

            menuToggle.addEventListener('click', this.menuToggleHandler);

            // Reset menu state on window resize
            window.addEventListener('resize', function() {
                if (window.innerWidth > 768) {
                    navMenu.classList.remove('mobile-menu-active');
                    navMenu.style.display = '';
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }
}

// Global component loader instance
window.componentLoader = new ComponentLoader();

/**
 * Utility function to load components automatically
 * Call this in your page's DOMContentLoaded event
 */
window.loadComponents = async function() {
    return await window.componentLoader.loadAllComponents();
};

/**
 * Auto-load components when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Only auto-load if placeholders exist
    const hasHeaderPlaceholder = document.querySelector('#header-placeholder');
    const hasFooterPlaceholder = document.querySelector('#footer-placeholder');
    
    if (hasHeaderPlaceholder || hasFooterPlaceholder) {
        await window.loadComponents();
    }
});

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
} 