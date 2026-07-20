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
        const headerVersionElement = document.getElementById('header-version-number'); // Add header badge
        const badge = document.getElementById('version-badge');
        const reveal = () => { if (badge) badge.classList.remove('version-badge--pending'); };

        if (this.totalCount > 0) {
            // Use the total commit count from the database as the version number
            const version = this.totalCount;
            versionElement.textContent = `v${version}`;
            // Update header badge — no "v" prefix, the HTML span already has it
            if (headerVersionElement) {
                headerVersionElement.textContent = version;
            }
            reveal();
            // Sync sessionStorage so components.js cache stays current
            try { sessionStorage.setItem('site_version', version); } catch (e) {}
        } else {
            versionElement.textContent = 'v0';
            if (headerVersionElement) {
                headerVersionElement.textContent = '0';
            }
            reveal();
        }
    }

    displayChangelog() {
        const timeline = document.getElementById('commit-timeline');

        // Remove old load-more button
        const oldBtn = timeline.querySelector('.load-more-btn');
        if (oldBtn) oldBtn.remove();

        // Count already-rendered items to only append new ones
        const renderedCount = timeline.querySelectorAll('.timeline-item').length;

        if (this.allData.length === 0 && renderedCount === 0) {
            timeline.innerHTML = '';
            const p = document.createElement('p');
            p.className = 'no-data';
            p.textContent = 'No changelog entries found in D1 database.';
            timeline.appendChild(p);
            return;
        }

        const fragment = document.createDocumentFragment();

        for (let i = renderedCount; i < this.allData.length; i++) {
            fragment.appendChild(this.createTimelineItem(this.allData[i], i));
        }

        timeline.appendChild(fragment);

        // Add load more button if there are more entries
        if (this.hasMore) {
            this.addLoadMoreButton(timeline);
        }
    }

    createTimelineItem(entry, index) {
        const isBot = (entry.author_name || '').toLowerCase().includes('[bot]') ||
                      (entry.author_email || '').toLowerCase().includes('[bot]');

        const item = document.createElement('div');
        item.className = isBot ? 'timeline-item timeline-item--bot' : 'timeline-item';
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

        const isDegenai = (entry.author_name || '').toLowerCase() === 'degenai';
        const contentClass = isBot ? 'timeline-content timeline-content--bot'
                           : isDegenai ? 'timeline-content timeline-content--degenai'
                           : 'timeline-content';
        const markerClass = isBot ? 'timeline-marker timeline-marker--bot' : 'timeline-marker';
        const authorClass = isDegenai ? 'commit-author commit-author--degenai' : 'commit-author';

        const markerDiv = document.createElement('div');
        markerDiv.className = markerClass;

        const contentDiv = document.createElement('div');
        contentDiv.className = contentClass;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'timeline-header';

        const hashSpan = document.createElement('span');
        hashSpan.className = 'commit-hash';
        hashSpan.textContent = shortHash;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'commit-date';
        dateSpan.textContent = formattedDate;

        const authorSpan = document.createElement('span');
        authorSpan.className = authorClass;
        authorSpan.textContent = entry.author_name || '';

        headerDiv.append(hashSpan, dateSpan, authorSpan);

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'timeline-body';

        const titleH3 = document.createElement('h3');
        titleH3.className = 'commit-message';
        titleH3.textContent = commitTitle;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'commit-details';
        detailsDiv.style.display = 'none';

        const fullMessageDiv = document.createElement('div');
        fullMessageDiv.className = 'full-commit-message';

        const fullMessageH4 = document.createElement('h4');
        fullMessageH4.textContent = 'Full Commit Message:';

        const verboseMessageDiv = document.createElement('div');
        verboseMessageDiv.className = 'verbose-message';

        const lines = fullMessage.split('\n');
        lines.forEach((line, i) => {
            if (i > 0) {
                verboseMessageDiv.appendChild(document.createElement('br'));
            }
            let currentIndex = 0;
            const regex = /\b(WHAT:|WHY:|TECHNICAL:)\b/g;
            let match;
            while ((match = regex.exec(line)) !== null) {
                if (match.index > currentIndex) {
                    verboseMessageDiv.appendChild(document.createTextNode(line.substring(currentIndex, match.index)));
                }
                const strong = document.createElement('strong');
                strong.textContent = match[0];
                verboseMessageDiv.appendChild(strong);
                currentIndex = regex.lastIndex;
            }
            if (currentIndex < line.length) {
                verboseMessageDiv.appendChild(document.createTextNode(line.substring(currentIndex)));
            }
        });

        fullMessageDiv.append(fullMessageH4, verboseMessageDiv);

        const hr = document.createElement('hr');

        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'commit-metadata';

        const hashP = document.createElement('p');
        const hashStrong = document.createElement('strong');
        hashStrong.textContent = 'Full Hash: ';
        hashP.append(hashStrong, entry.commit_hash);

        const emailP = document.createElement('p');
        const emailStrong = document.createElement('strong');
        emailStrong.textContent = 'Author Email: ';
        emailP.append(emailStrong, entry.author_email || 'N/A');

        const dateP = document.createElement('p');
        const dateStrong = document.createElement('strong');
        dateStrong.textContent = 'Commit Date: ';
        dateP.append(dateStrong, new Date(entry.commit_date).toLocaleString());

        metadataDiv.append(hashP, emailP, dateP);

        detailsDiv.append(fullMessageDiv, hr, metadataDiv);

        const button = document.createElement('button');
        button.className = 'toggle-details';
        button.textContent = 'Show Details';

        bodyDiv.append(titleH3, detailsDiv, button);
        contentDiv.append(headerDiv, bodyDiv);
        item.append(markerDiv, contentDiv);

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
        if (timeline.querySelector('.loading-ring')) return;

        const ring = document.createElement('div');
        ring.className = 'loading-ring';
        ring.appendChild(document.createElement('div'));
        ring.appendChild(document.createElement('div'));
        ring.appendChild(document.createElement('div'));
        ring.appendChild(document.createElement('div'));

        const msg = document.createElement('p');
        msg.className = 'loading-message';
        msg.textContent = 'Fetching data from D1 database...';

        timeline.appendChild(ring);
        timeline.appendChild(msg);
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
        timeline.innerHTML = '';

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';

        const icon = document.createElement('i');
        icon.className = 'fas fa-exclamation-triangle';

        const heading = document.createElement('h3');
        heading.textContent = 'Error Loading D1 Changelog';

        const para = document.createElement('p');
        para.textContent = message;

        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.onclick = () => location.reload();

        errorDiv.append(icon, heading, para, retryBtn);
        timeline.appendChild(errorDiv);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.d1Changelog = new D1Changelog();
});
