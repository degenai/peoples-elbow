/**
 * The People's Elbow - Development Ring JavaScript
 * This script loads git commit data and displays it as an update timeline.
 * It also displays the current build number based on meaningful commits.
 * 
 * The timeline shows a curated history of meaningful changes to the site,
 * filtering out automated updates and other noise commits.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Changelog script running');
    console.log('BUILD VERSION DIRECT CHECK: ' + (window.PEOPLES_ELBOW_VERSION_DATA ? window.PEOPLES_ELBOW_VERSION_DATA.version : 'NOT LOADED YET'));
    
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
        console.log('Setting version number to:', version);
        
        // Update specific elements if they exist
        if (versionNumberElement) {
            versionNumberElement.textContent = version;
            // Add a flash effect to show the update happened
            versionNumberElement.style.transition = 'color 0.3s';
            versionNumberElement.style.color = '#ffcc00';
            setTimeout(() => versionNumberElement.style.color = '', 1000);
        } else {
            console.error('Version number element not found!');
        }
        
        if (footerVersionElement) {
            footerVersionElement.textContent = version;
        } else {
            console.error('Footer version element not found!');
        }
        
        // Also update any other version elements with class version-number
        const allVersionElements = document.querySelectorAll('.version-number, #header-version-number');
        console.log('Found', allVersionElements.length, 'version elements to update');
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
     * Extracts the commit type from the commit message for display
     * Uses the same type mapping as the version generator
     */
    function getCommitType(message) {
        if (!message) return 'UPDATE'; // Default type
        
        // Map conventional commit prefixes to UI-friendly tags
        const typePatterns = {
            'feat': 'FEATURE',
            'feature': 'FEATURE',
            'fix': 'FIX',
            'docs': 'DOCS',
            'style': 'STYLE',
            'refactor': 'REFACTOR',
            'perf': 'PERFORMANCE',
            'test': 'TEST',
            'build': 'BUILD',
            'security': 'SECURITY',
            'update': 'UPDATE'
        };
        
        // Check for conventional commit format: type(scope): message
        for (const [pattern, type] of Object.entries(typePatterns)) {
            if (message.match(new RegExp(`^${pattern}(\\([^)]*\\))?:`, 'i'))) {
                return type;
            }
        }
        
        // Default to UPDATE for older commits without conventional format
        return 'UPDATE';
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
        
        console.log(`Displaying ${commits.length} commits in timeline`);
        
        commits.forEach((commit, index) => {
            try {
                // Create the timeline item
                const timelineItem = document.createElement('div');
                timelineItem.className = 'timeline-item';
                
                // Add the date indicator
                const dateElement = document.createElement('div');
                dateElement.className = 'timeline-date';
                dateElement.textContent = commit.date;
                
                // Add the version indicator
                const versionElement = document.createElement('div');
                versionElement.className = 'timeline-version';
                versionElement.textContent = `BUILD ${commit.version}`;
                
                // Get commit type tag - use the type directly if available from the generator
                // or compute it from the subject line
                let commitType = commit.commitType || getCommitType(commit.subject);
                
                // Add the type tag
                const typeElement = document.createElement('div');
                typeElement.className = `timeline-tag ${commitType.toLowerCase()}`;
                typeElement.textContent = commitType;
                
                // Clean up the commit message for display
                const messageText = cleanCommitMessage(commit.subject);
                
                // Add the commit content
                const contentElement = document.createElement('div');
                contentElement.className = 'timeline-content';
                contentElement.textContent = messageText;
                
                // Add the indicator dot
                const indicatorElement = document.createElement('div');
                indicatorElement.className = 'timeline-indicator';
                
                // Make the item expandable to show full message
                timelineItem.addEventListener('click', function() {
                    // Toggle expanded class
                    if (timelineItem.classList.contains('expanded')) {
                        timelineItem.classList.remove('expanded');
                        contentElement.textContent = messageText;
                    } else {
                        timelineItem.classList.add('expanded');
                        // Show the full commit message when expanded
                        let fullMessage = commit.message;
                        
                        // Format sections if they exist (WHAT:, WHY:, TECHNICAL:)
                        const sections = [
                            { name: 'WHAT:', regex: /\bWHAT:\s*([\s\S]*?)(?=\b(WHY:|TECHNICAL:|$))/i },
                            { name: 'WHY:', regex: /\bWHY:\s*([\s\S]*?)(?=\b(TECHNICAL:|$))/i },
                            { name: 'TECHNICAL:', regex: /\bTECHNICAL:\s*([\s\S]*?)$/i }
                        ];
                        
                        let formattedMessage = messageText;
                        let hasDetails = false;
                        
                        // Extract and format sections if they exist
                        sections.forEach(section => {
                            const match = fullMessage.match(section.regex);
                            if (match && match[1].trim()) {
                                hasDetails = true;
                                formattedMessage += `\n\n<strong>${section.name}</strong>\n${match[1].trim()}`;
                            }
                        });
                        
                        // If no structured sections were found, just show the raw message
                        if (!hasDetails && fullMessage !== messageText) {
                            formattedMessage = fullMessage;
                        }
                        
                        contentElement.innerHTML = formattedMessage.replace(/\n/g, '<br>');
                    }
                });
                
                // Assemble the timeline item
                timelineItem.appendChild(dateElement);
                timelineItem.appendChild(versionElement);
                timelineItem.appendChild(typeElement);
                timelineItem.appendChild(contentElement);
                timelineItem.appendChild(indicatorElement);
                
                fragment.appendChild(timelineItem);
            } catch (error) {
                console.error(`Error processing commit ${index}:`, error);
            }
        });
        
        timelineElement.appendChild(fragment);
        console.log('Timeline display complete with', commits.length, 'entries');
    }
    
    // Immediately set version if data is available
    function trySetVersionImmediately() {
        if (window.PEOPLES_ELBOW_VERSION_DATA && window.PEOPLES_ELBOW_VERSION_DATA.version) {
            console.log('Setting version immediately to:', window.PEOPLES_ELBOW_VERSION_DATA.version);
            setVersionNumber(window.PEOPLES_ELBOW_VERSION_DATA.version);
            return true;
        }
        return false;
    }
    
    // Try to set version immediately, without waiting for all the rendering
    if (!trySetVersionImmediately()) {
        console.warn('Could not set version immediately, will retry in 100ms');
        setTimeout(trySetVersionImmediately, 100);
    }
    
    // Process version data
    if (window.PEOPLES_ELBOW_VERSION_DATA) {
        const versionData = window.PEOPLES_ELBOW_VERSION_DATA;
        console.log('Version data found:', versionData.version);
        console.log('Total commits:', versionData.commits ? versionData.commits.length : 0);

        // Set version again to ensure it's displayed
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
