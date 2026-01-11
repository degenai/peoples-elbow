// Test script to validate commit filtering logic
const fs = require('fs');
const path = require('path');

// Read version-data.js
const versionDataPath = path.join(__dirname, 'js', 'version-data.js');
const versionDataContent = fs.readFileSync(versionDataPath, 'utf8');

// Extract the JSON data from the file
// The file has the format: window.PEOPLES_ELBOW_VERSION_DATA = {...}
const dataStart = versionDataContent.indexOf('{');
const dataEnd = versionDataContent.lastIndexOf('}') + 1;
const jsonData = versionDataContent.substring(dataStart, dataEnd);

// Parse the JSON data
const versionData = JSON.parse(jsonData);

console.log('=== COMMIT FILTERING TEST ===');
console.log(`Version data found: ${versionData.version}`);
console.log(`Total commits: ${versionData.commits ? versionData.commits.length : 0}`);

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
        console.log('Found commit with formatting issue:', fixedCommit.subject);
        fixedCommit.subject = fixedCommit.subject.replace('rename to " Development Ring', 'rename to "Development Ring"');
        console.log(`Fixed formatting issue -> ${fixedCommit.subject}`);
    }
    
    return fixedCommit;
});

// Log filtered and corrected commits that will be displayed
console.log('\nCommits after filtering and corrections:');
correctedCommits.forEach((commit, i) => {
    console.log(`[${i}] Version ${commit.version}: ${commit.subject} (${commit.date})`);
});

console.log('\n=== TEST COMPLETE ===');
