#!/usr/bin/env node

/**
 * Generate SQL file for D1 Changelog Population
 * Creates a single SQL file to import all meaningful commits at once
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎯 Generating SQL file for D1 Changelog Population\n');

// Get git history in reverse order (oldest first) 
console.log('📜 Extracting full git commit history...');
const gitOutput = execSync('git log --pretty=format:"%H<|DELIM|>%B<|DELIM|>%ai<|DELIM|>%an<|DELIM|>%ae<|COMMIT_END|>" --reverse', { 
    encoding: 'utf8',
    cwd: __dirname 
});

const allCommits = gitOutput.trim().split('<|COMMIT_END|>').filter(entry => entry.trim()).map(commitData => {
    const parts = commitData.split('<|DELIM|>');
    if (parts.length >= 5) {
        const [hash, message, date, name, email] = parts;
        return { 
            hash: hash.trim(), 
            message: message.trim(), 
            date: date.trim(), 
            name: name.trim(), 
            email: email.trim() 
        };
    }
    return null;
}).filter(commit => commit !== null);

console.log(`📊 Found ${allCommits.length} total commits.`);

/**
 * Smart filtering for meaningful development commits
 */
function isMeaningfulCommit(commit, index, allCommits) {
    const msg = commit.message.toLowerCase();
    
    // ALWAYS INCLUDE: Initial commit and early development (first 20 commits)
    if (index < 20) {
        console.log(`📌 Including early commit #${index + 1}: ${commit.message.substring(0, 50)}...`);
        return true;
    }
    
    // ALWAYS INCLUDE: Initial setup and major milestones
    if (msg.includes('initial commit') || 
        msg.includes('initial') || 
        msg.includes('setup') ||
        msg.includes('migration') ||
        msg.includes('first') ||
        msg.includes('create') && (msg.includes('homepage') || msg.includes('main') || msg.includes('site'))) {
        return true;
    }
    
    // EXCLUDE: Version update noise
    if (msg.includes('chore: update version data') && msg.includes('[skip ci]')) {
        return false;
    }
    
    // EXCLUDE: Simple merge commits  
    if (msg.startsWith('merge branch') || msg.startsWith('merge pull request')) {
        return false;
    }
    
    // EXCLUDE: GitHub Actions automated commits
    if (msg.includes('[skip ci]') && (msg.includes('chore:') || msg.includes('bot:'))) {
        return false;
    }
    
    // INCLUDE: Meaningful development work
    const meaningfulPrefixes = [
        'feat:', 'feature:', 'fix:', 'docs:', 'refactor:', 
        'perf:', 'security:', 'style:', 'test:', 'build:'
    ];
    
    const hasMeaningfulPrefix = meaningfulPrefixes.some(prefix => 
        msg.startsWith(prefix)
    );
    
    // INCLUDE: Non-conventional but meaningful action words
    const meaningfulActions = ['add', 'create', 'update', 'improve', 'enhance', 'implement'];
    const hasMeaningfulAction = meaningfulActions.some(action => 
        msg.startsWith(action) || msg.includes(` ${action} `)
    );
    
    // INCLUDE: Commits with substantial content
    const hasSubstantialContent = commit.message.length > 40;
    
    return hasMeaningfulPrefix || hasMeaningfulAction || hasSubstantialContent;
}

// Filter for meaningful commits
const meaningfulCommits = allCommits.filter((commit, index) => isMeaningfulCommit(commit, index, allCommits));

console.log(`✨ Filtered to ${meaningfulCommits.length} meaningful commits for the changelog.\n`);

// Generate SQL file
console.log('📝 Generating SQL file...');

let sqlContent = `-- D1 Changelog Population - Curated Development History
-- Generated: ${new Date().toISOString()}
-- Total meaningful commits: ${meaningfulCommits.length}

-- Clear existing data
DELETE FROM changelog_entries;

-- Insert meaningful commits
`;

meaningfulCommits.forEach((commit, index) => {
    // Escape single quotes for SQL
    const escapedMessage = commit.message.replace(/'/g, "''");
    const escapedName = commit.name.replace(/'/g, "''");
    const escapedEmail = commit.email.replace(/'/g, "''");
    
    sqlContent += `INSERT INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('${commit.hash}', '${escapedMessage}', '${commit.date}', '${escapedName}', '${escapedEmail}');\n`;
});

// Write SQL file
const sqlFilePath = 'populate-changelog.sql';
fs.writeFileSync(sqlFilePath, sqlContent);

console.log(`✅ Generated ${sqlFilePath} with ${meaningfulCommits.length} commits`);
console.log(`\n🚀 To populate D1, run:`);
console.log(`npx wrangler d1 execute peoples-elbow-changelog --file=${sqlFilePath} --remote`);
console.log(`\n📊 This will populate your curated changelog with your complete development history!`);
