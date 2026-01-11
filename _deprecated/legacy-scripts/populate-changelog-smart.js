#!/usr/bin/env node

/**
 * Smart D1 Changelog Population - Curated Development History
 * 
 * This script filters git history to only include meaningful development milestones,
 * excluding CI noise, version updates, and merge commits.
 */

const { execSync } = require('child_process');

console.log('🎯 Smart D1 Changelog Population - Curating Development History\n');

// Get git history in reverse order (oldest first) 
console.log('📜 Extracting full git commit history...');
const gitOutput = execSync('git log --pretty=format:"%H|%s|%ai|%an|%ae" --reverse', { 
    encoding: 'utf8',
    cwd: __dirname 
});

const allCommits = gitOutput.trim().split('\n').map(line => {
    const [hash, message, date, name, email] = line.split('|');
    return { hash, message, date, name, email };
});

console.log(`📊 Found ${allCommits.length} total commits.`);

/**
 * Smart filtering for meaningful development commits
 * Based on The People's Elbow filtering logic from changelog.js
 */
function isMeaningfulCommit(commit, index, allCommits) {
    const msg = commit.message.toLowerCase();
    
    // ALWAYS INCLUDE: Initial commit and early development (first 20 commits)
    // These represent the foundational work before conventional commit format was adopted
    if (index < 20) {
        console.log(`📌 Including early commit #${index + 1}: ${commit.message.substring(0, 50)}...`);
        return true;
    }
    
    // ALWAYS INCLUDE: Initial setup and major milestones regardless of position
    if (msg.includes('initial commit') || 
        msg.includes('initial') || 
        msg.includes('setup') ||
        msg.includes('migration') ||
        msg.includes('first') ||
        msg.includes('create') && (msg.includes('homepage') || msg.includes('main') || msg.includes('site'))) {
        return true;
    }
    
    // EXCLUDE: Version update noise (CI automation)
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
    
    // INCLUDE: Meaningful development work with conventional commits
    const meaningfulPrefixes = [
        'feat:', 'feature:', 'fix:', 'docs:', 'refactor:', 
        'perf:', 'security:', 'style:', 'test:', 'build:'
    ];
    
    // Check for conventional commits
    const hasMeaningfulPrefix = meaningfulPrefixes.some(prefix => 
        msg.startsWith(prefix)
    );
    
    // INCLUDE: Non-conventional but meaningful action words
    const meaningfulActions = ['add', 'create', 'update', 'improve', 'enhance', 'implement'];
    const hasMeaningfulAction = meaningfulActions.some(action => 
        msg.startsWith(action) || msg.includes(` ${action} `)
    );
    
    // INCLUDE: Commits with substantial content (detailed messages indicating real work)
    const hasSubstantialContent = commit.message.length > 40;
    
    return hasMeaningfulPrefix || hasMeaningfulAction || hasSubstantialContent;
}

// Filter for meaningful commits
const meaningfulCommits = allCommits.filter((commit, index) => isMeaningfulCommit(commit, index, allCommits));

console.log(`✨ Filtered to ${meaningfulCommits.length} meaningful commits for the changelog.\n`);

// Log what we're including
console.log('📝 Commits selected for D1 changelog:');
meaningfulCommits.forEach((commit, index) => {
    console.log(`${index + 1}. ${commit.hash.substring(0, 8)} - ${commit.message}`);
});

if (meaningfulCommits.length === 0) {
    console.log('❌ No meaningful commits found. Check filtering logic.');
    process.exit(1);
}

console.log('\n🗄️ Clearing existing database and populating with curated commits...');

// Clear existing data first
try {
    execSync('npx wrangler d1 execute peoples-elbow-changelog --command "DELETE FROM changelog_entries;" --remote', {
        encoding: 'utf8',
        stdio: 'inherit'
    });
    console.log('✅ Cleared existing changelog entries.');
} catch (error) {
    console.log('⚠️ Warning: Could not clear existing data (might be empty).');
}

// Insert meaningful commits one by one to avoid batch issues
let insertedCount = 0;
for (const commit of meaningfulCommits) {
    try {
        // Escape single quotes for SQL
        const escapedMessage = commit.message.replace(/'/g, "''");
        const escapedName = commit.name.replace(/'/g, "''");
        const escapedEmail = commit.email.replace(/'/g, "''");
        
        const sql = `INSERT OR IGNORE INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES ('${commit.hash}', '${escapedMessage}', '${commit.date}', '${escapedName}', '${escapedEmail}');`;
        
        execSync(`npx wrangler d1 execute peoples-elbow-changelog --command "${sql}" --remote`, {
            encoding: 'utf8',
            stdio: 'pipe' // Suppress output for cleaner logs
        });
        
        insertedCount++;
        process.stdout.write(`\r📥 Inserted ${insertedCount}/${meaningfulCommits.length} commits...`);
        
    } catch (error) {
        console.error(`\n❌ Failed to insert commit ${commit.hash.substring(0, 8)}: ${error.message}`);
    }
}

console.log('\n\n🔍 Verifying D1 database population...');

// Verify the data was inserted
try {
    const result = execSync('npx wrangler d1 execute peoples-elbow-changelog --command "SELECT COUNT(*) as total FROM changelog_entries;" --remote', {
        encoding: 'utf8'
    });
    
    console.log('✅ Database verification complete!');
    
} catch (error) {
    console.error('❌ Error verifying database:', error.message);
}

console.log('\n🎉 Smart D1 Changelog Population Complete!');
console.log('🌐 Test the curated changelog at: http://localhost:8080/changelog.html');
console.log('📊 Your D1 changelog now shows only meaningful development milestones!');
