# Documentation Principles

## Core Standard

Use this test when designing or evaluating a documentation system:

`Can a first-time contributor, years later, quickly find the right document?`

If the answer depends on hidden project history, milestone slang, or asking a veteran what a name means, the system is too brittle.

## Separate Roles

A durable documentation system usually needs to distinguish between:

1. current long-term docs
2. active initiative docs
3. archived historical docs
4. design decision docs

Do not force all four roles into the same document type.

## Keep Current Docs Easy To Reach

Current docs should be the easiest docs to find.

They explain:

- what the system is
- how it works now
- what the current rules are

They should not be buried under historical or workflow-oriented directories.

## Keep Initiatives Lightweight

Initiatives exist to help active work progress.

They are not:

- permanent knowledge bases
- complete work logs
- replacements for current docs

When initiative conclusions become durable, they should be written back into the long-term docs before the initiative is archived.

## Treat Archive As Optional Historical Context

Archive helps with backtracking and understanding past reasoning.

It does not guarantee complete coverage of all historical changes.

A repository can have a useful archive even if many changes were never documented there.

## Treat Decisions As High-Leverage Why Documents

Decision records are not required for every local explanation.

Use them only when a repository needs a stable place for an important cross-cutting why.

Their main value is:

- concentrating high-leverage reasoning in one place
- linking current docs to the why behind them
- making re-check triggers explicit

## Prefer Stable Names

Good names should be understandable without hidden context.

Prefer:

- topic names
- direct nouns and noun phrases
- stable `kebab-case`

Avoid:

- milestone codes
- numeric-only identifiers
- temporary labels like `latest` or `draft2`

## Require Same-Change Updates For Live Status

If a document contains live status, the status must be updated in the same change that altered reality.

This matters especially for:

- initiative `status`
- initiative `当前状态`
- initiative `下一步`
- decision status after a material architectural change
