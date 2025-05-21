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
        
        // Track versions we've already displayed (avoid duplicates)
        const displayedVersions = new Set();
        let displayedCount = 0;
        
        commits.forEach((commit, index) => {
            try {
                // Check for duplicate versions - only show the first occurrence of each version
                // (but always show version-incrementing commits)
                if (!commit.isVersionIncrementing && displayedVersions.has(commit.version)) {
                    console.log('Skipping duplicate version:', commit.version, commit.hash);
                    return;
                }
                
                // Track this version as displayed
                displayedVersions.add(commit.version);
                
                // Create timeline item
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

                // Use the pre-calculated commit type for the small tag
                const uiCommitType = commit.commitType;
                const typeElement = document.createElement('div');
                typeElement.className = `timeline-tag ${uiCommitType ? uiCommitType.toLowerCase() : 'update'}`;
                typeElement.textContent = uiCommitType || 'UPDATE';

                // Main content container - gets styled by commit.shortType
                const contentWrapper = document.createElement('div');
                contentWrapper.className = `timeline-content ${commit.shortType || 'update'}`;

                // Cleaned commit subject (short message)
                const messageText = cleanCommitMessage(commit.subject);
                const subjectElement = document.createElement('div');
                subjectElement.className = 'timeline-message'; // For hover effects and styling
                subjectElement.textContent = messageText;
                
                // Add toggle icon to subjectElement
                const toggleIconElement = document.createElement('span');
                toggleIconElement.className = 'message-toggle';
                toggleIconElement.innerHTML = '<i class="fas fa-chevron-down"></i>';
                subjectElement.appendChild(toggleIconElement);
                contentWrapper.appendChild(subjectElement);

                // Full message container (initially hidden by CSS)
                const fullMessageElement = document.createElement('div');
                fullMessageElement.className = 'timeline-full-message';

                let fullMessageContent = commit.message;
                let formattedDetailedMessage = '';
                let hasDetails = false;
                const sections = [
                    { name: 'WHAT:', regex: /\bWHAT:\s*([\s\S]*?)(?=\b(WHY:|TECHNICAL:|$))/i },
                    { name: 'WHY:', regex: /\bWHY:\s*([\s\S]*?)(?=\b(TECHNICAL:|$))/i },
                    { name: 'TECHNICAL:', regex: /\bTECHNICAL:\s*([\s\S]*?)$/i }
                ];

                sections.forEach(section => {
                    const match = fullMessageContent.match(section.regex);
                    if (match && match[1].trim()) {
                        hasDetails = true;
                        // Keep line breaks from commit, convert to <br> for HTML
                        const sectionText = match[1].trim().replace(/\n/g, '<br>');
                        formattedDetailedMessage += `<strong>${section.name}</strong><br>${sectionText}<br><br>`;
                    }
                });

                if (!hasDetails) {
                    formattedDetailedMessage = (fullMessageContent !== messageText) ? fullMessageContent.replace(/\n/g, '<br>') : messageText.replace(/\n/g, '<br>');
                } else {
                    formattedDetailedMessage = formattedDetailedMessage.replace(/(<br>){2,2}$/, ''); // Trim trailing <br><br>
                }
                fullMessageElement.innerHTML = formattedDetailedMessage.trim() ? formattedDetailedMessage : messageText.replace(/\n/g, '<br>');
                contentWrapper.appendChild(fullMessageElement);

                // Add the indicator dot
                const dotElement = document.createElement('div');
                dotElement.className = 'timeline-dot'; // Renamed from timeline-indicator

                // Event listener for expanding/collapsing
                timelineItem.addEventListener('click', function() {
                    timelineItem.classList.toggle('expanded');
                    fullMessageElement.classList.toggle('show');
                    const icon = toggleIconElement.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('fa-chevron-down');
                        icon.classList.toggle('fa-chevron-up');
                    }
                });

                // Assemble the timeline item
                timelineItem.appendChild(dotElement); // Dot usually comes first visually in vertical timelines or alongside content
                timelineItem.appendChild(dateElement);
                timelineItem.appendChild(versionElement);
                timelineItem.appendChild(typeElement);
                timelineItem.appendChild(contentWrapper); // contentWrapper now contains subject and full message

                fragment.appendChild(timelineItem);
                displayedCount++;
                
            } catch (error) {
                console.error(`Error processing commit ${index}:`, error);
            }    
        });
        
        timelineElement.appendChild(fragment);
        console.log('Timeline display complete with', displayedCount, 'entries out of', commits.length, 'total commits');
    }
    
    // Process version data
    if (window.PEOPLES_ELBOW_VERSION_DATA) {
        const versionData = window.PEOPLES_ELBOW_VERSION_DATA;
        console.log('Version data found:', versionData.version);
        console.log('Last updated:', versionData.lastUpdated);
        console.log('Total commits in data:', versionData.commits.length);

    // Set the global version number for the page
    setVersionNumber(versionData.version);

    // Initial log of all commits from version-data.js
    console.log('Raw commits from version-data.js:');
    versionData.commits.forEach((commit, i) => {
        console.log(`[Raw ${i}] Hash: ${commit.hash}, Version ${commit.version}, SkipIncrement: ${commit.shouldSkipVersionIncrement}, SkipCI: ${commit.isSkipCiCommit}, Subject: ${commit.subject}`);
    });

    // Filter for meaningful commits to display on the timeline
    // We only want to show commits that increment the version and are not marked [skip ci]
    const meaningfulDisplayCommits = versionData.commits.filter(commit => {
        const isMeaningful = !commit.shouldSkipVersionIncrement;
        const isNotSkipCi = !commit.isSkipCiCommit;
        return isMeaningful && isNotSkipCi;
    });

    console.log(`
--- TIMELINE COMMIT SELECTION ---`);
    console.log(`Total raw commits: ${versionData.commits.length}`);
    console.log(`Commits selected for timeline display: ${meaningfulDisplayCommits.length}`);
    meaningfulDisplayCommits.forEach((commit, i) => {
        console.log(`  [Display ${i}] Hash: ${commit.hash}, Version: ${commit.version}, Subject: ${commit.subject}`);
    });
    console.log('--- END TIMELINE COMMIT SELECTION ---\n');

    // Use timeout for better performance and display the selected commits
    setTimeout(() => {
        try {
            if (meaningfulDisplayCommits.length > 0) {
                displayCommitHistory(meaningfulDisplayCommits);
                console.log('Timeline displayed successfully with meaningful commits.');
            } else {
                console.log('No meaningful commits to display on the timeline.');
                if (timelineElement) timelineElement.innerHTML = '<p>No significant updates to display at this time.</p>';
            }
        } catch (error) {
            console.error('Display error:', error);
            showErrorMessage('Error displaying timeline: ' + error.message);
        }
    }, 10);
    } else {
        // Handle case where version data is not found
        console.warn('PEOPLES_ELBOW_VERSION_DATA not found. Displaying fallback message.');
        if (timelineElement) { // timelineElement is defined at the top of DOMContentLoaded
            timelineElement.innerHTML = '<p>Loading Development Ring data...</p>';
        }
        // Fallback if data doesn't load
        setTimeout(() => {
            // A flag like window.PEOPLES_ELBOW_VERSION_DATA_LOADED would be better here,
            // which version-data.js or the successful part of the 'if' block would set.
            // For now, re-checking PEOPLES_ELBOW_VERSION_DATA.
            if (!window.PEOPLES_ELBOW_VERSION_DATA) { 
                console.warn('Timeout: PEOPLES_ELBOW_VERSION_DATA still not available. Showing error.');
                // showErrorMessage is defined at the top of DOMContentLoaded
                showErrorMessage('Could not load Development Ring data. Please try refreshing the page.');
            }
        }, 5000); // 5-second timeout for fallback
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
