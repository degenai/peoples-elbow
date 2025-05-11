/**
 * The People's Elbow - Version Data Generator
 * This script generates version data from git commits
 * 
 * Run this script before deploying to generate version-data.js
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
    
    // Replace any escaped backslashes with a single backslash
    str = str.replace(/\\+/g, '\\');
    
    // Make sure quotes are properly escaped
    str = str.replace(/\\"/g, '"').replace(/"/g, '\"');
    
    // Clean up any trailing backslashes that might cause issues
    str = str.replace(/\\+$/g, '');
    
    return str;
}

// Get current commit count for version number (excluding noise commits)
function getCommitCount() {
    try {
        // Count only meaningful commits
        // This is a bit more complex, so we'll do it in multiple steps
        
        // First get all non-merge commits
        const allNonMergeCommits = execSync('git rev-list --no-merges HEAD').toString().trim().split('\n');
        
        // Now filter out noise commits (skip-ci and version updates)
        const meaningfulCommitCount = allNonMergeCommits.filter(hash => {
            try {
                const commitSubject = execSync(`git log --format=%s -n 1 ${hash}`).toString().trim();
                
                // Skip commits with [skip ci] tag
                if (commitSubject.includes('[skip ci]')) {
                    return false;
                }
                
                // Skip version update commits
                if (commitSubject.includes('update version data')) {
                    return false;
                }
                
                // Include all other commits
                return true;
            } catch (e) {
                // If there's an error, just include the commit
                return true;
            }
        }).length;
        
        return meaningfulCommitCount.toString();
    } catch (error) {
        console.error('Error getting commit count:', error.message);
        return '0';
    }
}

// Get commit history - load all commits
function getCommitHistory(count = 100) {  // Increased from 20 to 100 to capture full history
    try {
        // First get the hashes to use for the full messages
        const gitHashCommand = `git log --pretty=format:"%H" -n ${count}`;
        const hashes = execSync(gitHashCommand).toString().split('\n');
        
        // Now get the summary info (hash|date|subject line)
        const gitLogCommand = `git log --pretty=format:"%h|%ad|%s" --date=short -n ${count}`;
        const commitLog = execSync(gitLogCommand).toString();
        
        // First pass: create basic commit objects without version calculation
        const rawCommits = commitLog.split('\n').map((line, index) => {
            const parts = line.split('|');
            const shortHash = parts[0];
            const date = parts[1];
            let subject = parts[2]; // Use let instead of const to allow modification
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
            const isSkipCiCommit = subject.includes('[skip ci]');
            const shouldSkipVersionIncrement = isMergeCommit || isSkipCiCommit;
            
            return {
                hash: shortHash,
                date,
                subject,
                message: fullMessage,
                isMergeCommit,
                isSkipCiCommit,
                shouldSkipVersionIncrement
            };
        });
        
        // Get total meaningful commit count from git
        const totalMeaningfulCommits = parseInt(getCommitCount());
        
        // Second pass: calculate versions properly
        let nonMergeCount = 0;
        let previousVersion = totalMeaningfulCommits.toString();
        
        // Apply version numbers (with correct handling of skipped commits)
        const commits = rawCommits.map((commit, index) => {
            let version;
            
            if (!commit.shouldSkipVersionIncrement) {
                // This is a meaningful commit that increments version
                version = (totalMeaningfulCommits - nonMergeCount).toString();
                previousVersion = version;
                nonMergeCount++;
            } else {
                // For commits that don't increment version, use previous version
                // If this is the first commit (unlikely), use the total count
                version = index === 0 ? totalMeaningfulCommits.toString() : previousVersion;
            }
            
            return {
                ...commit,
                version,
                isVersionIncrementing: !commit.shouldSkipVersionIncrement
            };
        });
        
        return commits;
    } catch (error) {
        console.error('Error getting commit history:', error.message);
        return [];
    }
}

// Generate the version data JavaScript file
function generateVersionDataFile() {
    const commitCount = getCommitCount();
    const commits = getCommitHistory();
    
    // Create version data object
    const versionData = {
        version: commitCount,
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
    
    console.log(`Version data generated successfully!`);
    console.log(`Current version: ${commitCount}`);
    console.log(`File saved to: ${outputPath}`);
    
    // Add diagnostic info to check how far back commit history goes
    try {
        // Count all meaningful commits (no noise)
        const rawCommitCount = execSync('git rev-list --count HEAD').toString().trim();
        const totalNonMergeCommits = execSync('git rev-list --no-merges --count HEAD').toString().trim();
        
        // Get earliest commit
        const oldestCommit = execSync('git log --format="%h %s" --reverse --max-count=1').toString().trim();
        
        // Get the version numbers of the earliest commits
        const oldestCommits = execSync('git log --format="%h %s" --reverse --max-count=10').toString().trim();
        
        console.log('\n--- DIAGNOSTIC COMMIT INFORMATION ---');
        console.log(`Total commits in repo: ${rawCommitCount}`);
        console.log(`Non-merge commits: ${totalNonMergeCommits}`);
        console.log(`Current filtered version: ${commitCount}`);
        console.log(`Oldest commit: ${oldestCommit}`);
        console.log('\nOldest 10 commits:');
        console.log(oldestCommits);
        console.log('--- END DIAGNOSTIC INFO ---');
    } catch (error) {
        console.error('Error getting diagnostic info:', error.message);
    }
}

// Run the generator
generateVersionDataFile();
