#!/usr/bin/env node

/**
 * Populate D1 Changelog Database with Git History
 * 
 * This script extracts git commit history and populates the D1 database
 * with changelog entries via direct SQL execution.
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🏗️  Populating D1 Changelog Database...\n');

// Get git history in reverse order (oldest first)
console.log('📜 Extracting git commit history...');
const gitOutput = execSync('git log --pretty=format:"%H|%s|%ai|%an|%ae" --reverse', { 
    encoding: 'utf8',
    cwd: __dirname 
});

const commits = gitOutput.trim().split('\n').map(line => {
    const [hash, message, date, name, email] = line.split('|');
    return { hash, message, date, name, email };
});

console.log(`Found ${commits.length} commits to process.\n`);

// Create SQL file for bulk insertion
const sqlStatements = [
    '-- D1 Changelog Population Script',
    '-- Generated from git history',
    ''
];

commits.forEach((commit, index) => {
    // Escape single quotes in commit messages
    const escapedMessage = commit.message.replace(/'/g, "''");
    const escapedName = commit.name.replace(/'/g, "''");
    const escapedEmail = commit.email.replace(/'/g, "''");
    
    sqlStatements.push(
        `INSERT OR IGNORE INTO changelog_entries (commit_hash, commit_message, commit_date, author_name, author_email) VALUES (` +
        `'${commit.hash}', ` +
        `'${escapedMessage}', ` +
        `'${commit.date}', ` +
        `'${escapedName}', ` +
        `'${escapedEmail}');`
    );
    
    console.log(`${index + 1}. ${commit.hash.substring(0, 8)} - ${commit.message}`);
});

// Write SQL file
const sqlFile = 'populate-changelog.sql';
fs.writeFileSync(sqlFile, sqlStatements.join('\n'));

console.log(`\n📝 Generated ${sqlFile} with ${commits.length} INSERT statements.`);
console.log('\n🚀 Now executing against D1 database...\n');

// Execute against D1 database
try {
    console.log('Executing against remote D1 database...');
    const result = execSync(`npx wrangler d1 execute peoples-elbow-changelog --file ${sqlFile} --remote`, {
        encoding: 'utf8',
        stdio: 'inherit'
    });
    
    console.log('\n✅ Database population completed successfully!');
    console.log('\n🔍 Verifying data...');
    
    // Verify the data was inserted
    const countResult = execSync('npx wrangler d1 execute peoples-elbow-changelog --command "SELECT COUNT(*) as total FROM changelog_entries;" --remote', {
        encoding: 'utf8'
    });
    
    console.log(countResult);
    
} catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    console.log('\n💡 You can manually run:');
    console.log(`   npx wrangler d1 execute peoples-elbow-changelog --file ${sqlFile} --remote`);
}

console.log('\n🎉 D1 Changelog population complete!');
console.log('🌐 Test your changelog at: https://peoples-elbow.com/changelog.html');
