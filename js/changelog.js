/**
 * The People's Elbow - Development Ring JavaScript
 * This script loads git commit data and displays it as an update timeline.
 * It also displays the current version based on commit count.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Changelog script running');
    
    // Elements we'll be updating
    const timelineElement = document.getElementById('commit-timeline');
    const versionNumberElement = document.getElementById('version-number');
    const footerVersionElement = document.getElementById('footer-version-number');
    
    console.log('Timeline element found:', timelineElement ? 'Yes' : 'No');
    console.log('Version number element found:', versionNumberElement ? 'Yes' : 'No');
    console.log('Footer version element found:', footerVersionElement ? 'Yes' : 'No');
    
    /**
     * Sets the version number on the page
     */
    function setVersionNumber(version) {
        // Update specific elements if they exist
        if (versionNumberElement) {
            versionNumberElement.textContent = version;
        }
        
        if (footerVersionElement) {
            footerVersionElement.textContent = version;
        }
        
        // Also update any other version elements with class version-number
        const allVersionElements = document.querySelectorAll('.version-number, #header-version-number');
        allVersionElements.forEach(element => {
            element.textContent = version;
        });
    }
    
    /**
     * Shows an error message in the timeline
     */
    function showErrorMessage(message) {
        if (!timelineElement) return;
        
        timelineElement.innerHTML = `
            <div class="timeline-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    /**
     * Extracts the commit type from the commit message
     */
    function getCommitType(message) {
        if (!message) return null;
        
        const typePatterns = {
            'feat': 'feat',
            'feature': 'feat',
            'fix': 'fix',
            'docs': 'docs',
            'style': 'style',
            'refactor': 'refactor',
            'chore': 'chore'
        };
        
        for (const [pattern, type] of Object.entries(typePatterns)) {
            if (message.match(new RegExp(`^${pattern}(\\([^)]*\\))?:`, 'i'))) {
                return type;
            }
        }
        
        return null;
    }
    
    /**
     * Cleans up the commit message for display
     */
    function cleanCommitMessage(message) {
        if (!message) return '';
        return message.replace(/^[a-z]+(\\([^)]*\\))?:\\s*/i, '');
    }
    
    /**
     * Displays the commit history in the timeline
     */
    function displayCommitHistory(commits) {
        if (!timelineElement) return;
        
        timelineElement.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        commits.forEach((commit, index) => {
            try {
                // Create timeline item
                const timelineItem = document.createElement('div');
                timelineItem.className = 'timeline-item';
                
                // Create dot
                const timelineDot = document.createElement('div');
                timelineDot.className = 'timeline-dot';
                
                // Create content container
                const timelineContent = document.createElement('div');
                timelineContent.className = 'timeline-content';
                
                // Add type class
                const commitType = getCommitType(commit.message);
                if (commitType) {
                    timelineContent.classList.add(commitType);
                }
                
                // Add date
                const timelineDate = document.createElement('div');
                timelineDate.className = 'timeline-date';
                timelineDate.textContent = commit.date;
                
                // Add version
                const timelineVersion = document.createElement('div');
                timelineVersion.className = 'timeline-version';
                timelineVersion.textContent = `Version ${commit.version}`;
                
                // Add type tag
                const timelineTag = document.createElement('div');
                timelineTag.className = 'timeline-tag';
                timelineTag.textContent = commitType || 'update';
                
                // Add message subject
                const timelineMessage = document.createElement('div');
                timelineMessage.className = 'timeline-message';
                timelineMessage.textContent = cleanCommitMessage(commit.subject || commit.message.split('\\n')[0]);
                
                // Create container for full message
                const fullMessageContainer = document.createElement('div');
                fullMessageContainer.className = 'timeline-full-message';
                
                // Get full message
                const fullMessage = commit.message || '';
                const firstLine = commit.subject || fullMessage.split('\\n')[0];
                
                // Process other lines
                const otherLines = fullMessage.split('\\n')
                    .filter(line => line !== firstLine && line.trim() !== '')
                    .map(line => line.trim())
                    .join('<br>');
                
                fullMessageContainer.innerHTML = otherLines;
                
                // Add toggle if there's more content
                if (fullMessageContainer.innerHTML.trim() !== '') {
                    const toggleIndicator = document.createElement('span');
                    toggleIndicator.className = 'message-toggle';
                    toggleIndicator.innerHTML = '<i class="fas fa-angle-down"></i>';
                    timelineMessage.appendChild(toggleIndicator);
                    
                    timelineMessage.addEventListener('click', function() {
                        fullMessageContainer.classList.toggle('show');
                        toggleIndicator.querySelector('i').classList.toggle('fa-angle-down');
                        toggleIndicator.querySelector('i').classList.toggle('fa-angle-up');
                    });
                }
                
                // Assemble item
                timelineContent.appendChild(timelineDate);
                timelineContent.appendChild(timelineVersion);
                timelineContent.appendChild(timelineTag);
                timelineContent.appendChild(timelineMessage);
                
                if (fullMessageContainer.innerHTML.trim() !== '') {
                    timelineContent.appendChild(fullMessageContainer);
                }
                
                timelineItem.appendChild(timelineDot);
                timelineItem.appendChild(timelineContent);
                fragment.appendChild(timelineItem);
            } catch (error) {
                console.error(`Error processing commit ${index}:`, error);
            }
        });
        
        timelineElement.appendChild(fragment);
    }
    
    // Process version data
    if (window.PEOPLES_ELBOW_VERSION_DATA) {
        const versionData = window.PEOPLES_ELBOW_VERSION_DATA;
        console.log('Version data found:', versionData.version);
        console.log('Commits found:', versionData.commits ? versionData.commits.length : 0);

        // Set version
        setVersionNumber(versionData.version);

        // Filter merge commits
        const filteredCommits = versionData.commits.filter(commit => {
            return !commit.subject || !commit.subject.startsWith('Merge branch');
        });
        
        console.log('Filtered commits:', filteredCommits.length);

        // Use timeout for better performance
        setTimeout(() => {
            try {
                displayCommitHistory(filteredCommits);
                console.log('Timeline displayed successfully');
            } catch (error) {
                console.error('Display error:', error);
                showErrorMessage('Error: ' + error.message);
            }
        }, 10);
    } else {
        console.error('Version data not found');
        setVersionNumber('?');
        showErrorMessage('Version data not available');
    }
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error in changelog.js:', e.error || e.message);
    const timelineElement = document.getElementById('commit-timeline');
    if (timelineElement) {
        timelineElement.innerHTML = `
            <div class="timeline-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Something went wrong loading the timeline. Try refreshing.</p>
            </div>
        `;
    }
});
