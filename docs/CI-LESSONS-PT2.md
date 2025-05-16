# The People's Elbow: CI/CD Lessons Learned, Part 2

## The Version Number Showdown of 2025

Following "The Great Version Inflation" incident, we faced an even more persistent challenge: **The Version Number Lag**. Despite multiple improvement attempts, our Development Ring kept showing version numbers that were one behind the actual state. It was like watching a wrestler show up to last week's match!

### The Symptoms

1. **Persistent Version Lag**: Version numbers were consistently one behind the actual commit count
2. **Competing Version Systems**: Different counting methods in our generator vs. GitHub workflow
3. **Timeline Inconsistencies**: Some commits showed incorrect version numbers
4. **Version Mismatch**: The top-level version number (79) would differ from timeline versions (40s)

### The Core Issue

The root problem was a fundamental timing issue in our GitHub Actions workflow:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Commit Made      │────▶│ Workflow Runs    │────▶│ Version Updated  │
│ (Not yet counted)│     │ (Counts commits) │     │ (One behind)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

The version generator ran **before the triggering commit itself was counted** in the version number. We also had two competing systems:

1. The **filtered approach** in generate-version-data.js (removing merges, skip-ci commits, etc.)
2. The **simple git count** approach in the GitHub workflow (`git rev-list --count main`)

### The Tag Team Solution

We implemented a complete overhaul of our version system with a "Tag Team" approach that divided responsibilities clearly:

#### 1. Single Source of Truth

We established a single source of truth for version counting - using a filtered approach that counts only "meaningful" commits:

```javascript
function isMeaningfulCommit(commitSubject) {
    // Explicitly exclude these types of commits
    if (commitSubject.includes('[skip ci]')) return false;
    if (commitSubject.includes('update version data')) return false;
    if (commitSubject.startsWith('Merge branch')) return false;
    
    // Include commits with these conventional commit prefixes
    const meaningfulPrefixes = [
        'feat', 'feature', 'fix', 'docs', 'style', 'refactor',
        'perf', 'test', 'build', 'security', 'update'
    ];
    
    // Check for conventional commit format
    for (const prefix of meaningfulPrefixes) {
        if (commitSubject.match(new RegExp(`^${prefix}(\\([^)]*\\))?:`, 'i'))) {
            return true;
        }
    }
    
    return true; // Count early commits without conventional format
}
```

#### 2. Simplified GitHub Workflow

We streamlined our GitHub Actions workflow, removing the need for complex patching:

```yaml
- name: Generate version data
  if: steps.commit_check.outputs.should_update != 'false'
  run: |
    # Our improved generator now handles all filtering and counting properly
    echo "Running version data generation with proper filtering"
    node generate-version-data.js
    
    # Show the version number for the logs
    VERSION=$(grep -o '"version": "[0-9]*"' js/version-data.js | grep -o '[0-9]*')
    echo "Generated version data with build number: $VERSION"
```

#### 3. Consistent Front-end Display

We updated our display code to use the same filtering and type detection logic:

```javascript
// Get commit type tag - use the type directly if available from the generator
// or compute it from the subject line
let commitType = commit.commitType || getCommitType(commit.subject);

// Add the type tag
const typeElement = document.createElement('div');
typeElement.className = `timeline-tag ${commitType.toLowerCase()}`;
typeElement.textContent = commitType;
```

### What We Learned

1. **Timing Matters**: In CI/CD, the sequence of steps is critical - especially when counting things
2. **Single Source of Truth**: Different components counting things differently leads to confusion
3. **Be Explicit About Filtering**: Clear rules for what constitutes a "meaningful" change prevents misunderstandings
4. **Enhanced Error Handling**: Robust error reporting helped identify edge cases
5. **Clean Data Generation**: Better sanitization prevents display issues in your UI

### Recent Improvements (May 2025)

We've made several key improvements to address the remaining issues with our Development Ring:

1. **Version Calculation Alignment**: Fixed the issue where the global version number didn't match the timeline versions by using the same counting logic everywhere.

```javascript
// Count all meaningful commits (ones we want to include in version numbering)
const meaningfulCommits = commits.filter(c => !c.shouldSkipVersionIncrement);

// The highest build number should be one less than the total meaningful commits
// This is because we start from Build 0, so 47 meaningful commits = Build 46 as highest version
const highestBuildNumber = meaningfulCommits.length > 0 ? (meaningfulCommits.length - 1).toString() : "0";
```

2. **Timeline Display Restoration**: Restored the refined styling of our timeline while preserving the improved commit filtering:

```javascript
// Create proper timeline structure with dots and content containers
const timelineItem = document.createElement('div');
timelineItem.className = 'timeline-item';

// Create dot (important for styling)
const timelineDot = document.createElement('div');
timelineDot.className = 'timeline-dot';

// Create content container with commit type styling
const timelineContent = document.createElement('div');
timelineContent.className = 'timeline-content';
if (commitType) {
    timelineContent.classList.add(commitType.toLowerCase());
}
```

3. **Duplicate Version Filtering**: Added a mechanism to prevent duplicate version numbers in the timeline, making it cleaner and more accurate:

```javascript
// Track versions we've already displayed (avoid duplicates)
const displayedVersions = new Set();

// Check for duplicate versions - only show the first occurrence of each version
// (but always show version-incrementing commits)
if (!commit.isVersionIncrementing && displayedVersions.has(commit.version)) {
    console.log('Skipping duplicate version:', commit.version, commit.hash);
    return;
}
```

### Future Plans

With these improvements, our Development Ring now shows a clean, consistent history of the project's evolution, with accurate build numbers that tell the real story of our progress. We still have room to improve:

- [ ] Update early commit messages to provide more detailed descriptions for the timeline
- [ ] Add visual indicators for different commit types (icons next to tags)
- [ ] Consider adding a "Jump to version" feature for quickly finding specific changes
- [ ] Implement more comprehensive tests to catch version issues before they appear in production

Just like a wrestling champion constantly improving their technique, our CI pipeline continues to evolve to better serve our mutual aid project!
