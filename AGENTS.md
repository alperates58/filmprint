# Repository Agent Rules

- Use the narrowest validation command relevant to the change.
- Run each validation command at most once per task.
- Do not rerun a failed validation command unless the code has changed.
- Stop any validation command that exceeds 180 seconds and report its last output.
- Do not run `npm run verify:full` automatically.
- Do not run Docker builds, container restarts, deploys, database commands, or migrations without explicit user approval.
- Never read, print, or log secrets or `.env` file contents.

