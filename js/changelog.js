/**
 * The People's Elbow - Changelog JavaScript
 * This script loads git commit data and displays it as an update timeline.
 * It also displays the current version based on commit count.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elements we'll be updating
    const timelineElement = document.getElementById('commit-timeline');
    const versionNumberElement = document.getElementById('version-number');
    const footerVersionElement = document.getElementById('footer-version-number');
    const headerVersionElement = document.getElementById('header-version-number');
    
    // Check if we have version data available
    if (window.PEOPLES_ELBOW_VERSION_DATA) {
        // We have real data from git
        const versionData = window.PEOPLES_ELBOW_VERSION_DATA;
        
        // Set the version number
        setVersionNumber(versionData.version);
        
        // Display the commit history
        displayCommitHistory(versionData.commits);
    } else {
        // Fallback in case version data isn't available
        console.warn('Version data not found. Run generate-version-data.js to create version data.');
        
        // Set a fallback version
        setVersionNumber('?');
        
        // Show a message in the timeline
        showErrorMessage('Version data not available. Please run the version data generator script.');
    }
    
    /**
     * Sets the version number on the page
     */
    function setVersionNumber(version) {
        if (versionNumberElement) {
            versionNumberElement.textContent = version;
        }
        if (footerVersionElement) {
            footerVersionElement.textContent = version;
        }
        if (headerVersionElement) {
            headerVersionElement.textContent = version;
        }
    }
    
    /**
     * Shows an error message in the timeline
     */
    function showErrorMessage(message) {
        if (timelineElement) {
            timelineElement.innerHTML = `
                <div class="timeline-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    /**
     * Displays the commit history in the timeline
     */
    function displayCommitHistory(commits) {
        // Clear the loading state
        timelineElement.innerHTML = '';
        
        // Process each commit
        commits.forEach((commit, index) => {
            // Create the timeline item
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            
            // Create the timeline dot
            const timelineDot = document.createElement('div');
            timelineDot.className = 'timeline-dot';
            
            // Create the content container
            const timelineContent = document.createElement('div');
            timelineContent.className = 'timeline-content';
            
            // Determine commit type and add appropriate class
            const commitType = getCommitType(commit.message);
            if (commitType) {
                timelineContent.classList.add(commitType);
            }
            
            // Add the date
            const timelineDate = document.createElement('div');
            timelineDate.className = 'timeline-date';
            timelineDate.textContent = commit.date;
            
            // Add the version number
            const timelineVersion = document.createElement('div');
            timelineVersion.className = 'timeline-version';
            timelineVersion.textContent = `Version ${commit.version}`;
            
            // Add the commit type tag
            const timelineTag = document.createElement('div');
            timelineTag.className = 'timeline-tag';
            timelineTag.textContent = commitType || 'update';
            
            // Add the commit subject (first line)
            const timelineMessage = document.createElement('div');
            timelineMessage.className = 'timeline-message';
            timelineMessage.textContent = cleanCommitMessage(commit.subject || commit.message.split('\n')[0]);
            
            // Create container for the full message (hidden by default)
            const fullMessageContainer = document.createElement('div');
            fullMessageContainer.className = 'timeline-full-message';
            
            // Format the full message with proper line breaks
            const fullMessage = commit.message || '';
            
            // Convert the message to HTML with line breaks
            fullMessageContainer.innerHTML = fullMessage
                .split('\n')
                .map(line => {
                    // Skip the first line as it's already shown
                    if (line === (commit.subject || commit.message.split('\n')[0])) {
                        return '';
                    }
                    return line.trim();
                })
                .filter(line => line !== '')
                .join('<br>');
                
            // Only add the container if there's more content beyond the subject
            if (fullMessageContainer.innerHTML.trim() !== '') {
                // Add toggle indicator
                const toggleIndicator = document.createElement('span');
                toggleIndicator.className = 'message-toggle';
                toggleIndicator.innerHTML = '<i class="fas fa-angle-down"></i>';
                timelineMessage.appendChild(toggleIndicator);
                
                // Add click event to toggle full message visibility
                timelineMessage.addEventListener('click', function() {
                    fullMessageContainer.classList.toggle('show');
                    toggleIndicator.querySelector('i').classList.toggle('fa-angle-down');
                    toggleIndicator.querySelector('i').classList.toggle('fa-angle-up');
                });
            }
            
            // Assemble the timeline item
            timelineContent.appendChild(timelineDate);
            timelineContent.appendChild(timelineVersion);
            timelineContent.appendChild(timelineTag);
            timelineContent.appendChild(timelineMessage);
            
            // Add the full message container if it has content
            if (fullMessageContainer.innerHTML.trim() !== '') {
                timelineContent.appendChild(fullMessageContainer);
            }
            
            timelineItem.appendChild(timelineDot);
            timelineItem.appendChild(timelineContent);
            
            // Add to the timeline
            timelineElement.appendChild(timelineItem);
        });
    }
    
    /**
     * Extracts the commit type from the commit message
     * Looks for conventional commit format: type(scope): message
     */
    function getCommitType(message) {
        // Looking for patterns like 'feat:', 'fix:', etc.
        const typePatterns = {
            'feat': 'feat',
            'feature': 'feat',
            'fix': 'fix',
            'docs': 'docs',
            'style': 'style',
            'refactor': 'refactor',
            'chore': 'chore'
        };
        
        // Check if message starts with a conventional commit type
        for (const [pattern, type] of Object.entries(typePatterns)) {
            // Check for pattern(scope): or pattern:
            if (message.match(new RegExp(`^${pattern}(\\([^)]*\\))?:`, 'i'))) {
                return type;
            }
        }
        
        return null;
    }
    
    /**
     * Cleans up the commit message for display
     * Removes the commit type prefix for cleaner presentation
     */
    function cleanCommitMessage(message) {
        if (!message) return '';
        // Remove the type(scope): prefix for display
        return message.replace(/^[a-z]+(\([^)]*\))?:\s*/i, '');
    }
});
