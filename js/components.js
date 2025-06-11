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
            'map.html': 'map',
            'chat.html': 'chat',
            'changelog.html': 'changelog',
            'steal-this-site.html': 'steal-this-site',
            'dashboard.html': 'dashboard'
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

        targetElement.innerHTML = headerHtml;
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

        targetElement.innerHTML = footerHtml;
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
        const currentNavItem = document.querySelector(`nav a[data-nav="${this.currentPage}"]`);
        if (currentNavItem) {
            currentNavItem.classList.add('active');
        }

        // Special handling for home page sections
        if (this.currentPage === 'home') {
            const hash = window.location.hash;
            if (hash) {
                const sectionNav = document.querySelector(`nav a[href="index.html${hash}"]`);
                if (sectionNav) {
                    sectionNav.classList.add('active');
                }
            }
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
        // Re-initialize mobile menu if it exists in main.js
        if (window.initializeMobileMenu && typeof window.initializeMobileMenu === 'function') {
            window.initializeMobileMenu();
        }

        // Re-initialize version display if it exists
        if (window.initializeVersionDisplay && typeof window.initializeVersionDisplay === 'function') {
            window.initializeVersionDisplay();
        }

        // Initialize version number update after header is loaded
        this.initializeVersionNumber();

        // Re-initialize mobile menu functionality
        this.initializeMobileMenu();
    }

    /**
     * Initialize version number display
     */
    async initializeVersionNumber() {
        const headerVersionElement = document.getElementById('header-version-number');
        if (!headerVersionElement) return;
        
        try {
            // Fetch from the same D1 API that the changelog uses
            const response = await fetch('https://changelog-reader.alex-adamczyk.workers.dev/api/changelog?page=0&limit=1');
            const data = await response.json();
            
            if (data.success && data.pagination && data.pagination.total) {
                const version = data.pagination.total;
                headerVersionElement.textContent = version;
                
                // Special styling for version 100 milestone
                if (version === 100) {
                    const versionBadge = headerVersionElement.closest('.version-badge');
                    if (versionBadge) {
                        versionBadge.classList.add('milestone-100');
                    }
                }
                
                // Header version updated from D1 database
            } else {
                throw new Error('Invalid D1 response format');
            }
        } catch (error) {
            console.warn('Failed to fetch D1 version:', error);
            // Don't fall back to incorrect local data - show error state instead
            headerVersionElement.textContent = 'v?';
            headerVersionElement.style.opacity = '0.6';
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
                navMenu.classList.toggle('mobile-menu-active');
            };
            
            menuToggle.addEventListener('click', this.menuToggleHandler);
            
            // Reset menu state on window resize
            window.addEventListener('resize', function() {
                if (window.innerWidth > 768) {
                    navMenu.classList.remove('mobile-menu-active');
                    navMenu.style.display = '';
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