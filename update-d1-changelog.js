#!/usr/bin/env node

/**
 * D1 Changelog Automation Script
 * 
 * Incrementally updates the D1 changelog database with new meaningful commits.
 * Used in GitHub Actions to keep the changelog current without full repopulation.
 */

const { execSync } = require('child_process');

console.log(' D1 Changelog Incremental Update\n');

// Configuration
const WRITER_WORKER_URL = process.env.WRITER_WORKER_URL || 'https://peoples-elbow.alex-adamczyk.workers.dev'; // Fallback to main worker
const READER_WORKER_URL = 'https://changelog-reader.alex-adamczyk.workers.dev';

/**
 * Smart filtering for meaningful development commits
 * (Same logic as generate-changelog-sql.js)
 */
function isMeaningfulCommit(commit, index, allCommits) {
    const msg = commit.message.toLowerCase();
    
    // Always include early commits (first 20) regardless of format
    if (index < 20) {
        console.log(` Including early commit #${index + 1}: ${commit.message.substring(0, 60)}...`);
        return true;
    }
    
    // Exclude noise commits
    if (msg.includes('update version data [skip ci]') ||
        msg.includes('merge pull request') ||
        msg.includes('merge branch') ||
        msg.startsWith('merge ') ||
        msg.includes('[bot]') ||
        msg.includes('bot:') ||
        msg.includes('automated') ||
        msg.includes('auto-generated')) {
        return false;
    }
    
    // Include meaningful prefixes or substantial content
    const meaningfulPrefixes = ['feat:', 'fix:', 'docs:', 'style:', 'refactor:', 'test:', 'chore:', 'perf:', 'build:', 'ci:'];
    const hasMeaningfulPrefix = meaningfulPrefixes.some(prefix => msg.startsWith(prefix));
    const hasSubstantialContent = commit.message.length > 30;
    const hasKeywords = ['add', 'update', 'create', 'implement', 'enhance', 'improve', 'remove', 'delete', 'fix', 'resolve'].some(keyword => msg.includes(keyword));
    
    return hasMeaningfulPrefix || hasSubstantialContent || hasKeywords;
}

/**
 * Get the latest commit hash from D1 database
 */
async function getLatestD1Commit() {
    try {
        console.log(' Checking latest commit in D1...');
        const response = await fetch(`${READER_WORKER_URL}?limit=1&offset=0`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            const latestHash = data.data[0].commit_hash;
            console.log(` Latest D1 commit: ${latestHash.substring(0, 7)}`);
            return latestHash;
        } else {
            console.log(' No commits found in D1, will process all meaningful commits');
            return null;
        }
    } catch (error) {
        console.error(' Error checking D1:', error.message);
        return null;
    }
}

/**
 * Get new commits since the specified hash
 */
function getNewCommits(sinceHash) {
    console.log(' Getting new commits from git...');
    
    let gitCommand;
    if (sinceHash) {
        // Get commits newer than the latest D1 commit
        gitCommand = `git log --pretty=format:"%H<|DELIM|>%B<|DELIM|>%ai<|DELIM|>%an<|DELIM|>%ae<|COMMIT_END|>" ${sinceHash}..HEAD --reverse`;
    } else {
        // Get all commits (fallback)
        gitCommand = `git log --pretty=format:"%H<|DELIM|>%B<|DELIM|>%ai<|DELIM|>%an<|DELIM|>%ae<|COMMIT_END|>" --reverse`;
    }
    
    try {
        const gitOutput = execSync(gitCommand, { 
            encoding: 'utf8',
            cwd: __dirname 
        });

        if (!gitOutput.trim()) {
            console.log(' No new commits found');
            return [];
        }

        const commits = gitOutput.trim().split('<|COMMIT_END|>').filter(entry => entry.trim()).map(commitData => {
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

        console.log(` Found ${commits.length} new commits`);
        return commits;
    } catch (error) {
        console.error(' Error getting git commits:', error.message);
        return [];
    }
}

/**
 * Send commit to writer worker
 */
async function addCommitToD1(commit) {
    try {
        const response = await fetch(WRITER_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                commit_hash: commit.hash,
                commit_message: commit.message,
                commit_date: commit.date,
                author_name: commit.name,
                author_email: commit.email
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log(` Added: ${commit.hash.substring(0, 7)} - ${commit.message.substring(0, 60)}...`);
            return true;
        } else {
            console.error(` Failed to add ${commit.hash.substring(0, 7)}: ${result.error}`);
            return false;
        }
    } catch (error) {
        console.error(` Error adding commit ${commit.hash.substring(0, 7)}:`, error.message);
        return false;
    }
}

/**
 * Main automation function
 */
async function updateD1Changelog() {
    try {
        // Step 1: Get latest commit from D1
        const latestD1Hash = await getLatestD1Commit();
        
        // Step 2: Get new commits since latest D1 commit
        const newCommits = getNewCommits(latestD1Hash);
        
        if (newCommits.length === 0) {
            console.log(' D1 changelog is up to date!');
            return;
        }
        
        // Step 3: Filter for meaningful commits
        const meaningfulCommits = newCommits.filter((commit, index) => 
            isMeaningfulCommit(commit, index, newCommits)
        );
        
        console.log(`\n Found ${meaningfulCommits.length} meaningful commits out of ${newCommits.length} new commits`);
        
        if (meaningfulCommits.length === 0) {
            console.log(' No meaningful commits to add');
            return;
        }
        
        // Step 4: Add meaningful commits to D1
        console.log('\n Adding meaningful commits to D1...');
        let successCount = 0;
        
        for (const commit of meaningfulCommits) {
            const success = await addCommitToD1(commit);
            if (success) successCount++;
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`\n Successfully added ${successCount}/${meaningfulCommits.length} commits to D1 changelog`);
        
    } catch (error) {
        console.error(' Automation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    updateD1Changelog();
}

module.exports = { updateD1Changelog, isMeaningfulCommit };
