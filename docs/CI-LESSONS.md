# The People's Elbow: CI/CD Lessons Learned

## The Great Version Inflation of 2025

On May 9, 2025, we experienced "The Great Version Inflation" - an educational adventure in CI/CD pipeline design that resulted in our version number jumping from 27 to 39 in a matter of minutes!

### What Happened

1. We changed our GitHub Actions workflow trigger from `push` to `workflow_run` to avoid conflicts between our Pages build and version update workflows
2. This inadvertently created an infinite loop:
   - A commit triggered the Pages build
   - The Pages build completion triggered our version update
   - The version update commit triggered another Pages build
   - ...and so on until we fixed it!

### What We Learned

1. **Always Implement Recursive Protection**: Any workflow that modifies your codebase must have safeguards against triggering itself
2. **[skip ci] Tags Aren't Enough**: While we had the `[skip ci]` tag in commit messages, it wasn't sufficient with our workflow structure
3. **Content-Based Filtering**: Our solution was to examine file changes and skip the workflow when only version data files changed
4. **Dependency Management**: We structured our jobs with proper dependency chains to ensure they ran in the correct order

### The Fix

We implemented a two-part solution:

1. **File Change Detection**:
   ```yaml
   - id: filter
     name: Check if version-data.js was the only file changed
     run: |
       git diff --name-only HEAD^ HEAD
       # Skip if only version data files changed
   ```

2. **Conditional Execution**:
   ```yaml
   update-version:
     needs: check_changes
     if: ${{ needs.check_changes.outputs.should_run != 'false' }}
   ```

This experience demonstrates why proper CI/CD planning matters, and now lives on in our version history as a badge of honor - and a reminder to always plan for recursion in automation!

## Future Improvement Ideas

- [ ] Add more comprehensive testing before deployment
- [ ] Implement change-based workflow triggers instead of blanket triggers
- [ ] Consider using GitHub environments for better deployment control
