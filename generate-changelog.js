const fs = require('fs');
const { execSync } = require('child_process');

// Simple version generator for The People's Elbow
console.log('=== GENERATING CHANGELOG DATA ===');

try {
    // Get commit count first
    const totalCommits = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
    
    // Get commits with a simpler format
    const gitLog = execSync('git log --pretty=format:%H~~~%ad~~~%s~~~%an --date=short --no-merges', { encoding: 'utf8' });
    const commitLines = gitLog.split('\n').filter(line => line.trim());
    
    // Build commit objects
    const changelogData = {
        generated: new Date().toISOString(),
        totalCommits: totalCommits,
        commits: []
    };
    
    let version = totalCommits;
    commitLines.forEach((line) => {
        const parts = line.split('~~~');
        if (parts.length < 3) return;
        
        const [hash, date, subject, author] = parts;
        
        // Skip auto-generated commits
        if (subject && (subject.includes('[skip ci]') || 
            subject.includes('Update version data') ||
            subject.includes('chore: update version data'))) {
            return;
        }
        
        changelogData.commits.push({
            version: version--,
            hash: hash.substring(0, 7),
            date: date,
            subject: subject,
            author: author || 'Unknown'
        });
    });
    
    // Write the data
    const outputPath = './js/changelog-data.json';
    fs.writeFileSync(outputPath, JSON.stringify(changelogData, null, 2));
    
    console.log(`Generated changelog with ${changelogData.commits.length} commits`);
    console.log(`Latest version: ${changelogData.commits[0]?.version || 'N/A'}`);
    console.log(`Latest commit: ${changelogData.commits[0]?.subject || 'N/A'}`);
    console.log(`Saved to: ${outputPath}`);
    
} catch (error) {
    console.error('Error generating changelog:', error.message);
    process.exit(1);
}
