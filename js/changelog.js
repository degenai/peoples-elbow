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
        // First remove conventional commit prefix
        let cleaned = message.replace(/^[a-z]+(\([^)]*\))?:\s*/i, '');
        // Remove trailing backslashes that might cause display issues
        cleaned = cleaned.replace(/\\+$/g, '');
        // Clean up any double quotes that might be escaped incorrectly
        cleaned = cleaned.replace(/\\+"/g, '"');
        return cleaned;
    }
    
    /**
     * Displays the commit history in the timeline
     */
    function displayCommitHistory(commits) {
        if (!timelineElement) return;
        
        timelineElement.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        // Keep track of displayed versions to avoid showing duplicates with formatting issues
        const displayedVersions = new Set();
        
        commits.forEach((commit, index) => {
            // Keep basic duplicate version filtering
            // This is mainly for history entries with the same version number
            // but only if they're not the commit that actually incremented the version
            
            // Check for duplicate versions - only show the first occurrence of each version
            // (but always show version-incrementing commits)
            if (!commit.isVersionIncrementing && displayedVersions.has(commit.version)) {
                console.log('Skipping duplicate version:', commit.version, commit.hash);
                return;
            }
            
            // Track this version as displayed
            displayedVersions.add(commit.version);
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
                timelineVersion.textContent = `BUILD ${commit.version}`;
                
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
        console.log('Total commits:', versionData.commits ? versionData.commits.length : 0);

        // Set version
        setVersionNumber(versionData.version);

        // Track filtered commits for debugging
        const filtered = {
            versionUpdates: 0,
            mergeCommits: 0,
            skipCiCommits: 0,
            malformedEntries: 0,
            keptCommits: 0
        };

        // Debug output of all commits before filtering
        console.log('\n--- COMMIT FILTERING DETAILS ---');
        console.log('All commits before filtering:');
        versionData.commits.forEach((commit, i) => {
            console.log(`[${i}] Version ${commit.version}: ${commit.subject} (${commit.date})`);
        });
        
        // Filter out noise commits: merge commits, version updates, etc.
        const filteredCommits = versionData.commits.filter(commit => {
            // Skip merge commits
            if (commit.subject && commit.subject.startsWith('Merge branch')) {
                console.log(`Filtering out merge commit: ${commit.subject}`);
                filtered.mergeCommits++;
                return false;
            }
            
            // Skip version data updates
            if (commit.subject && commit.subject.includes('update version data')) {
                console.log(`Filtering out version update: ${commit.subject}`);
                filtered.versionUpdates++;
                return false;
            }
            
            // Skip commits with [skip ci] tag entirely from the display
            if (commit.isSkipCiCommit) {
                console.log(`Filtering out skip-ci commit: ${commit.subject}`);
                filtered.skipCiCommits++;
                return false;
            }
            
            // Skip any malformed entries
            if (commit.subject && commit.subject.includes('\\\'')) {
                console.log(`Filtering out malformed entry: ${commit.subject}`);
                filtered.malformedEntries++;
                return false;
            }
            
            // Keep all other commits
            filtered.keptCommits++;
            return true;
        });
        
        // Detailed filtering summary
        console.log('\n--- FILTERING SUMMARY ---');
        console.log(`Total commits before filtering: ${versionData.commits.length}`);
        console.log(`Version updates filtered: ${filtered.versionUpdates}`);
        console.log(`Merge commits filtered: ${filtered.mergeCommits}`);
        console.log(`Skip-CI commits filtered: ${filtered.skipCiCommits}`);
        console.log(`Malformed entries filtered: ${filtered.malformedEntries}`);
        console.log(`Commits kept: ${filtered.keptCommits}`);
        console.log(`Total commits displayed: ${filteredCommits.length}`);
        console.log('--- END OF FILTERING REPORT ---\n');
        
        // Fix any formatting issues in commit messages
        const correctedCommits = filteredCommits.map(commit => {
            // Make a copy of the commit to avoid modifying the original
            const fixedCommit = {...commit};
            
            // Fix Development Ring formatting issue with trailing backslash
            if (fixedCommit.subject && fixedCommit.subject.includes('rename to " Development Ring')) {
                fixedCommit.subject = fixedCommit.subject.replace('rename to " Development Ring', 'rename to "Development Ring"');
                console.log(`Fixed formatting issue in: ${commit.subject} -> ${fixedCommit.subject}`);
            }
            
            return fixedCommit;
        });
        
        // Log filtered and corrected commits that will be displayed
        console.log('Commits after filtering and corrections:');
        correctedCommits.forEach((commit, i) => {
            console.log(`[${i}] Version ${commit.version}: ${commit.subject} (${commit.date})`);
        });
        
        // Use timeout for better performance and display the corrected commits
        setTimeout(() => {
            try {
                displayCommitHistory(correctedCommits);
                console.log('Timeline displayed successfully with corrected commits');
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
