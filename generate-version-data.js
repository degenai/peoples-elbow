/**
 * The People's Elbow - Version Data Generator
 * This script generates version data from git commits
 * 
 * Run this script before deploying to generate version-data.js
 * 
 * This generates both the full commit history and a curated timeline
 * of meaningful updates for display in the Development Ring.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Sanitizes a string for safe inclusion in JSON
 * Handles quotes, backslashes, and other special characters
 */
function sanitizeForJSON(str) {
    if (!str) return '';
    
    try {
        // First try a simple approach - convert to JSON and back
        // This handles most common escaping issues
        const jsonStr = JSON.stringify(str);
        // Remove the surrounding quotes that stringify adds
        return jsonStr.substring(1, jsonStr.length - 1);
    } catch (error) {
        console.warn(`Warning: Advanced sanitization needed for string: ${str.substring(0, 20)}...`);
        
        // Fall back to manual replacement if JSON handling fails
        let sanitized = str;
        
        // Replace any escaped backslashes with a single backslash
        sanitized = sanitized.replace(/\\+/g, '\\');
        
        // Make sure quotes are properly escaped
        sanitized = sanitized.replace(/\\"/g, '"').replace(/"/g, '\"');
        
        // Clean up any trailing backslashes that might cause issues
        sanitized = sanitized.replace(/\\+$/g, '');
        
        return sanitized;
    }
}

/**
 * Determine if a commit is meaningful for version incrementing
 * Meaningful commits are those that represent actual changes to the site
 * rather than automated processes or merges
 */
function isMeaningfulCommit(commitSubject) {
    if (!commitSubject) return false;
    
    // Explicitly exclude these types of commits
    if (commitSubject.includes('[skip ci]')) return false;
    if (commitSubject.includes('update version data')) return false;
    if (commitSubject.startsWith('Merge branch')) return false;
    
    // Include commits with these conventional commit prefixes
    const meaningfulPrefixes = [
        'feat', 'feature', 'fix', 'docs', 'style', 'refactor',
        'perf', 'test', 'build', 'security', 'update'
    ];
    
    // Check for conventional commit format: type(scope): message
    for (const prefix of meaningfulPrefixes) {
        // Match both with and without scope: feat: or feat(scope):
        if (commitSubject.match(new RegExp(`^${prefix}(\\([^)]*\\))?:`, 'i'))) {
            return true;
        }
    }
    
    // For older commits or those without conventional format
    // We'll count them as meaningful if they don't match our exclusion rules
    // This ensures early commits still count in the version number
    return true;
}

/**
 * Get current commit count for version number (excluding noise commits)
 * Only counts meaningful commits based on our filtering rules
 */
function getCommitCount() {
    try {
        // Get all commits on the main branch
        const allCommits = execSync('git rev-list main').toString().trim().split('\n');
        console.log(`Total raw commits on main branch: ${allCommits.length}`);
        
        // Filter to only meaningful commits
        const meaningfulCommits = allCommits.filter(hash => {
            try {
                const commitSubject = execSync(`git log --format=%s -n 1 ${hash}`).toString().trim();
                return isMeaningfulCommit(commitSubject);
            } catch (e) {
                console.warn(`Warning: Error checking commit ${hash.substring(0, 7)}: ${e.message}`);
                // If there's an error, exclude the commit to be safe
                return false;
            }
        });
        
        console.log(`Meaningful commits after filtering: ${meaningfulCommits.length}`);
        return meaningfulCommits.length.toString();
    } catch (error) {
        console.error('Error getting commit count:', error.message);
        return '0';
    }
}

/**
 * Get commit history - load all commits
 * Uses the same filtering logic as getCommitCount for consistency
 */
function getCommitHistory(count = 500) {  // Increased count to capture more history
    try {
        // First get the full hashes to use for detailed messages
        const gitHashCommand = `git log --pretty=format:"%H" main -n ${count}`;
        const hashes = execSync(gitHashCommand).toString().split('\n');
        console.log(`Retrieved ${hashes.length} commit hashes from git log`);
        
        // Now get the summary info (hash|date|subject line)
        const gitLogCommand = `git log --pretty=format:"%h|%ad|%s" --date=short main -n ${count}`;
        const commitLog = execSync(gitLogCommand).toString();
        const commitLines = commitLog.split('\n');
        console.log(`Retrieved ${commitLines.length} commit log entries`);
        
        // First pass: create basic commit objects
        const rawCommits = commitLines.map((line, index) => {
            const parts = line.split('|');
            const shortHash = parts[0];
            const date = parts[1];
            let subject = parts[2];
            const fullHash = hashes[index];
            
            // Get the full commit message for this hash
            let fullMessage = '';
            try {
                // Get the full commit message (both subject and body)
                fullMessage = execSync(`git log --format=%B -n 1 ${fullHash}`).toString().trim();
            } catch (err) {
                console.error(`Error getting full message for ${shortHash}:`, err.message);
                fullMessage = subject; // Fallback to subject if there's an error
            }
            
            // Sanitize the subject and message to prevent malformed JSON issues
            subject = sanitizeForJSON(subject);
            fullMessage = sanitizeForJSON(fullMessage);
            
            // Determine commit type
            const isMergeCommit = subject.startsWith('Merge branch');
            const isSkipCiCommit = fullMessage.includes('[skip ci]');
            
            // Use our shared function to determine if this is a meaningful commit
            // This ensures consistent filtering between version counting and display
            const shouldSkipVersionIncrement = !isMeaningfulCommit(subject);
            
            // Extract commit type for use in UI tagging
            const commitType = getCommitTypeForUI(subject);
            
            return {
                hash: shortHash,
                date,
                subject,
                message: fullMessage,
                isMergeCommit,
                isSkipCiCommit,
                shouldSkipVersionIncrement,
                commitType
            };
        });
        
        // Get list of all meaningful commits (those that increment version)
        const meaningfulCommits = rawCommits.filter(commit => !commit.shouldSkipVersionIncrement);
        console.log(`Found ${meaningfulCommits.length} meaningful commits out of ${rawCommits.length} total commits`);
        
        // Calculate version numbers sequentially based on position
        // This ensures oldest commits have lowest build numbers
        const totalMeaningfulCommits = meaningfulCommits.length;
        
        // Build a version map for quick lookup
        // We need to start from the oldest (lowest number) to newest (highest number)
        // This makes the oldest commit "Build 0" and newest "Build 46"
        const versionMap = {};
        meaningfulCommits.reverse().forEach((commit, index) => {
            // Important: We reverse the array to start from the oldest commit
            // This ensures the oldest commit is Build 0, and newest is highest number
            versionMap[commit.hash] = index.toString();
        });
        // Put the array back in original order for the rest of processing
        meaningfulCommits.reverse();
        
        // Apply version numbers to all commits
        const commits = rawCommits.map(commit => {
            let version;
            let isVersionIncrementing = false;
            
            if (!commit.shouldSkipVersionIncrement) {
                // This is a meaningful commit that has its own version
                version = versionMap[commit.hash];
                isVersionIncrementing = true;
            } else {
                // For commits that don't increment version, find next meaningful commit after this one
                // This ensures non-meaningful commits show the "current" build at their time
                const nextMeaningful = rawCommits.findIndex(c => 
                    rawCommits.indexOf(c) > rawCommits.indexOf(commit) && !c.shouldSkipVersionIncrement
                );
                
                if (nextMeaningful >= 0) {
                    // Use version of next meaningful commit
                    version = versionMap[rawCommits[nextMeaningful].hash];
                } else {
                    // If no next meaningful commit, use the total count
                    version = totalMeaningfulCommits.toString();
                }
            }
            
            return {
                ...commit,
                version,
                isVersionIncrementing
            };
        });
        
        return commits;
    } catch (error) {
        console.error('Error getting commit history:', error.message);
        return [];
    }
}

/**
 * Gets a UI-friendly commit type from commit message
 * This is used for tagging commits in the Development Ring
 */
function getCommitTypeForUI(subject) {
    if (!subject) return 'UPDATE'; // Default tag
    
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
    
    for (const [pattern, type] of Object.entries(typePatterns)) {
        if (subject.match(new RegExp(`^${pattern}(\\([^)]*\\))?:`, 'i'))) {
            return type;
        }
    }
    
    // Default to UPDATE for commits without conventional prefix
    return 'UPDATE';
}

/**
 * Generate the version data JavaScript file
 * This is the main entry point that creates the version-data.js file
 */
function generateVersionDataFile() {
    console.log('\n=== THE PEOPLE\'S ELBOW VERSION DATA GENERATOR ===');
    console.log('Generating version data from git commits...');
    
    // First get the meaningful commit count for proper versioning
    const commitCount = getCommitCount();
    
    // Then get the full commit history with appropriate filtering
    const commits = getCommitHistory();
    
    // Count all meaningful commits (ones we want to include in version numbering)
    const meaningfulCommits = commits.filter(c => !c.shouldSkipVersionIncrement);
    
    // The highest build number should be one less than the total meaningful commits
    // This is because we start from Build 0, so 47 meaningful commits = Build 46 as highest version
    const highestBuildNumber = meaningfulCommits.length > 0 ? (meaningfulCommits.length - 1).toString() : "0";
    
    // Log the version calculation for debugging
    console.log(`Filtered ${commits.length} total commits down to ${meaningfulCommits.length} meaningful commits`);
    console.log(`Setting global version to ${highestBuildNumber} (${meaningfulCommits.length} meaningful commits - 1)`);
    
    const versionData = {
        version: highestBuildNumber,
        lastUpdated: new Date().toISOString(),
        commits: commits
    };
    
    // Convert to JavaScript variable assignment
    const jsContent = `/**
 * The People's Elbow - Auto-generated Version Data
 * Generated on: ${new Date().toISOString()}
 * DO NOT EDIT THIS FILE MANUALLY - run generate-version-data.js instead
 * 
 * This file is GENERATED and should not be manually merged during git operations.
 * If you encounter conflicts on this file during a merge, regenerate it using:
 * node generate-version-data.js
 */

window.PEOPLES_ELBOW_VERSION_DATA = ${JSON.stringify(versionData, null, 2)};
`;
    
    // Write to file
    const outputPath = path.join(__dirname, 'js', 'version-data.js');
    fs.writeFileSync(outputPath, jsContent);
    
    // Final output summary
    console.log('\n=== VERSION DATA GENERATED SUCCESSFULLY ===');
    console.log(`Current build: ${commitCount}`);
    console.log(`Meaningful commits tracked: ${commits.filter(c => !c.shouldSkipVersionIncrement).length}`);
    console.log(`Total commits processed: ${commits.length}`);
    console.log(`File saved to: ${outputPath}`);
    
    // Add detailed diagnostic info
    try {
        // Count commits in different ways for verification
        const rawMainCommits = execSync('git rev-list --count main').toString().trim();
        const totalNonMergeCommits = execSync('git rev-list --no-merges --count main').toString().trim();
        
        // Get information about the oldest commits
        const oldestCommit = execSync('git log --format="%h %s" --reverse --max-count=1').toString().trim();
        const oldestCommits = execSync('git log --format="%h %s" --reverse --max-count=5').toString().trim();
        
        // Get information about the newest commits
        const newestCommits = execSync('git log --format="%h %s" --max-count=5').toString().trim();
        
        console.log('\n=== DIAGNOSTIC COMMIT INFORMATION ===');
        console.log(`Raw commits on main branch: ${rawMainCommits}`);
        console.log(`Non-merge commits: ${totalNonMergeCommits}`);
        console.log(`Meaningful commits (filtered): ${commitCount}`);
        console.log(`\nOldest commit: ${oldestCommit}`);
        
        console.log('\nOldest 5 commits:');
        console.log(oldestCommits);
        
        console.log('\nNewest 5 commits:');
        console.log(newestCommits);
        
        // Show different counts side by side for easy comparison
        console.log('\n=== VERSION COUNT COMPARISON ===');
        console.log('| TOTAL RAW | NON-MERGE | MEANINGFUL |');
        console.log(`|    ${rawMainCommits.padEnd(7)} |   ${totalNonMergeCommits.padEnd(8)} |    ${commitCount.padEnd(8)} |`);
        console.log('=== END DIAGNOSTIC INFO ===');
    } catch (error) {
        console.error('Error getting diagnostic info:', error.message);
    }
}

// Run the generator
generateVersionDataFile();
