## Documentation Rules

All documentation work in this repository must follow the local documentation standard.

### Classification

Before creating, moving, renaming, or archiving any documentation, classify it into exactly one bucket:

1. long-term current documentation
2. design decision record
3. active initiative documentation
4. archived historical documentation

### Naming

1. Use stable, understandable topic names.
2. Do not use milestone codes, stage codes, numeric-only identifiers, or temporary names as primary names.
3. Use dates only where the documentation system explicitly requires them.

### Initiatives

If the repository uses `initiatives/`:

1. Each initiative should live under `docs/initiatives/<topic>/`.
2. Use `README.md` as the initiative entrypoint.
3. Keep initiative status current in the same change that alters reality.

### Decisions

If the repository uses `decisions/`:

1. Use them sparingly.
2. Require `related_docs` and `update_when`.
3. If a related current doc changes materially, check and update the related decision in the same change.

### Archive

If the repository uses `archive/`:

1. Treat it as retained historical context, not the current source of truth.
2. Keep archived package names time-oriented if time is the archive's primary lookup axis.
