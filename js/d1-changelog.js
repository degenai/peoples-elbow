/**
 * D1 Changelog JavaScript
 * Fetches changelog data from Cloudflare D1 database via changelog reader worker
 */

class D1Changelog {
    constructor() {
        this.CONFIG = {
            baseUrl: 'https://changelog-reader.alex-adamczyk.workers.dev',
            entriesPerPage: 20
        };
        this.currentPage = 0;
        this.allData = [];
        this.isLoading = false;
        this.hasMore = true;
        this.totalCount = 0; // New property to store total count
        
        this.init();
    }

    async init() {
        // D1 Changelog initializing
        await this.loadChangelog();
        this.setupEventListeners();
    }

    async loadChangelog(page = 0) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();

        try {
            const offset = page * this.CONFIG.entriesPerPage;
            const response = await fetch(`${this.CONFIG.baseUrl}?limit=${this.CONFIG.entriesPerPage}&offset=${offset}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load changelog data');
            }

            // For first page, replace data; for subsequent pages, append
            if (page === 0) {
                this.allData = data.data;
                this.totalCount = data.pagination.total; // Store total count from API
                this.displayVersionNumber();
            } else {
                this.allData.push(...data.data);
            }

            this.hasMore = data.pagination.hasMore;
            this.currentPage = page;
            
            this.displayChangelog();
            
        } catch (error) {
            console.error('Error loading D1 changelog:', error);
            this.showError(error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    displayVersionNumber() {
        const versionElement = document.getElementById('version-number');
        const footerVersionElement = document.getElementById('footer-version-number');
        const headerVersionElement = document.getElementById('header-version-number'); // Add header badge
        
        if (this.totalCount > 0) {
            // Use total count from database (87 meaningful commits) as version
            // This represents the complete curated development history
            const version = this.totalCount; 
            versionElement.textContent = `v${version}`;
            if (footerVersionElement) {
                footerVersionElement.textContent = `v${version}`;
            }
            // Update header badge with the same authoritative version
            if (headerVersionElement) {
                headerVersionElement.textContent = `v${version}`;
                // Header badge updated to authoritative D1 version
            }
        } else {
            versionElement.textContent = 'v0';
            if (footerVersionElement) {
                footerVersionElement.textContent = 'v0';
            }
            if (headerVersionElement) {
                headerVersionElement.textContent = 'v0';
            }
        }
    }

    displayChangelog() {
        const timeline = document.getElementById('commit-timeline');
        
        // Clear existing content except loading indicators
        const existingEntries = timeline.querySelectorAll('.timeline-item');
        existingEntries.forEach(item => item.remove());

        if (this.allData.length === 0) {
            timeline.innerHTML = '<p class="no-data">No changelog entries found in D1 database.</p>';
            return;
        }

        this.allData.forEach((entry, index) => {
            const timelineItem = this.createTimelineItem(entry, index);
            timeline.appendChild(timelineItem);
        });

        // Add load more button if there are more entries
        if (this.hasMore) {
            this.addLoadMoreButton(timeline);
        }
    }

    createTimelineItem(entry, index) {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.dataset.index = index;

        const date = new Date(entry.commit_date);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const shortHash = entry.commit_hash.substring(0, 7);
        
        // Extract commit title (first line) and full message
        const commitLines = entry.commit_message.split('\n');
        const commitTitle = commitLines[0] || entry.commit_message;
        const fullMessage = entry.commit_message;
        
        // Format the full message for display (preserve formatting, highlight sections)
        let formattedFullMessage = this.escapeHtml(fullMessage);
        // Highlight WHAT/WHY/TECHNICAL sections
        formattedFullMessage = formattedFullMessage.replace(/\b(WHAT:|WHY:|TECHNICAL:)\b/g, '<strong>$1</strong>');
        // Convert newlines to line breaks
        formattedFullMessage = formattedFullMessage.replace(/\n/g, '<br>');
        
        item.innerHTML = `
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="commit-hash">${shortHash}</span>
                    <span class="commit-date">${formattedDate}</span>
                    <span class="commit-author">${this.escapeHtml(entry.author_name)}</span>
                </div>
                <div class="timeline-body">
                    <h3 class="commit-message">${this.escapeHtml(commitTitle)}</h3>
                    <div class="commit-details" style="display: none;">
                        <div class="full-commit-message">
                            <h4>Full Commit Message:</h4>
                            <div class="verbose-message">${formattedFullMessage}</div>
                        </div>
                        <hr>
                        <div class="commit-metadata">
                            <p><strong>Full Hash:</strong> ${entry.commit_hash}</p>
                            <p><strong>Author Email:</strong> ${entry.author_email || 'N/A'}</p>
                            <p><strong>Commit Date:</strong> ${new Date(entry.commit_date).toLocaleString()}</p>
                        </div>
                    </div>
                    <button class="toggle-details">Show Details</button>
                </div>
            </div>
        `;

        return item;
    }

    addLoadMoreButton(timeline) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.textContent = 'Load More Commits';
        loadMoreBtn.onclick = () => this.loadMore();
        timeline.appendChild(loadMoreBtn);
    }

    async loadMore() {
        if (!this.hasMore || this.isLoading) return;
        await this.loadChangelog(this.currentPage + 1);
    }

    setupEventListeners() {
        // Event delegation for dynamically added elements
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-details')) {
                this.toggleDetails(e.target);
            }
        });
    }

    toggleDetails(button) {
        const timelineItem = button.closest('.timeline-item');
        const details = timelineItem.querySelector('.commit-details');
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            button.textContent = 'Hide Details';
        } else {
            details.style.display = 'none';
            button.textContent = 'Show Details';
        }
    }

    showLoading() {
        const timeline = document.getElementById('commit-timeline');
        const existingLoader = timeline.querySelector('.loading-ring');
        const existingMessage = timeline.querySelector('.loading-message');
        
        if (!existingLoader) {
            timeline.innerHTML = `
                <div class="loading-ring">
                    <div></div><div></div><div></div><div></div>
                </div>
                <p class="loading-message">Fetching data from D1 database...</p>
            `;
        }
    }

    hideLoading() {
        const timeline = document.getElementById('commit-timeline');
        const loader = timeline.querySelector('.loading-ring');
        const message = timeline.querySelector('.loading-message');
        
        if (loader) loader.remove();
        if (message) message.remove();
    }

    showError(message) {
        const timeline = document.getElementById('commit-timeline');
        timeline.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading D1 Changelog</h3>
                <p>${this.escapeHtml(message)}</p>
                <button onclick="location.reload()" class="retry-btn">Retry</button>
            </div>
        `;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.d1Changelog = new D1Changelog();
});
