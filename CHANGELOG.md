# Changelog

## 0.2.0

- Add `--from-starred` flag — scan repos from the authenticated user's stars
- Add `--starred-by <user>` flag — scan another user's stars
- Add `--star-limit <n>` flag (default 20) to cap starred-repo intake
- Sources combine and dedupe with explicit `--repos`
- `--repos` is no longer strictly required (one of `--repos` / `--from-starred` / `--starred-by` must be set)
- CLI prints a one-line source summary on stderr

## 0.1.1

- Add `@octokit/plugin-throttling` for graceful primary + secondary rate-limit handling
- Factored Octokit construction into `src/octokit.ts` with a `createOctokit()` factory

## 0.1.0

- Working scanner: fetches open unassigned issues by label, counts competing PRs via `#N in:body` search, fetches repo stars
- Filters: `maxExistingPRs`, `maxStaleDays`, bot-gated repos, invalid repo strings
- Scoring heuristic (competition + staleness + repo size)
- Table and JSON output

## 0.0.1

- Initial scaffolding
