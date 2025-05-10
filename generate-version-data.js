/**
 * The People's Elbow - Version Data Generator
 * This script generates version data from git commits
 * 
 * Run this script before deploying to generate version-data.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get current commit count for version number (excluding merge and skip-ci commits)
function getCommitCount() {
    try {
        // Count only meaningful commits (no merges, no skip-ci)
        // This is a bit more complex, so we'll do it in multiple steps
        
        // First get all non-merge commits
        const allNonMergeCommits = execSync('git rev-list --no-merges HEAD').toString().trim().split('\n');
        
        // Now filter out the skip-ci commits
        const meaningfulCommitCount = allNonMergeCommits.filter(hash => {
            try {
                const commitSubject = execSync(`git log --format=%s -n 1 ${hash}`).toString().trim();
                return !commitSubject.includes('[skip ci]');
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

// Get recent commit history
function getCommitHistory(count = 20) {
    try {
        // First get the hashes to use for the full messages
        const gitHashCommand = `git log --pretty=format:"%H" -n ${count}`;
        const hashes = execSync(gitHashCommand).toString().split('\n');
        
        // Now get the summary info (hash|date|subject line)
        const gitLogCommand = `git log --pretty=format:"%h|%ad|%s" --date=short -n ${count}`;
        const commitLog = execSync(gitLogCommand).toString();
        
        // First pass: create basic commit objects without version calculation
        const rawCommits = commitLog.split('\n').map((line, index) => {
            const [shortHash, date, subject] = line.split('|');
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
}

// Run the generator
generateVersionDataFile();
