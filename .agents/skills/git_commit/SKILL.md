---
name: commit
description: Automatically analyzes file changes, stages them, creates a detailed conventional commit message, commits, and pushes to GitHub.
---

# Git Commit & Push Workflow

Whenever the user triggers this skill (by using keywords like "commit", "git-commit", "push to github", etc.):

1. **Analyze changes**: Use `git status` and `git diff` to review all unstaged and staged changes.
2. **Stage changes**: Stage modified files except files in the repository-root `docs/` directory.
   - Never include `docs/` changes in the commit.
   - If `docs/` changes are already staged, unstage them with `git restore --staged -- docs/` without changing the working tree.
   - Stage the remaining changes with `git add -A -- . ':(exclude,top)docs/**'`.
   - Verify `git diff --cached --name-only` contains no path beginning with `docs/` before committing.
3. **Generate Commit Message**: Create a detailed conventional commit message:
   - Use standard prefixes: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.
   - Provide a concise summary on the first line.
   - Include a detailed body outlining the key changes and reasoning.
4. **Commit**: Run `git commit -m "<message>"` with the generated commit message.
5. **Push to Remote**: Run `git push` to push the changes to GitHub.
6. **Report**: Summarize the committed changes and confirm the push was successful.
