# gh-quest

> Find good-first-issues that genuinely need contributors — filters out raced and bot-gated issues.

Most popular OSS repos have a `good first issue` queue that's already saturated with racing PRs from contribution-farmers. By the time you read an issue, there are often 3–7 competing PRs already open against it. Submitting an 8th PR is wasted effort.

`gh-quest` scans a list of repos and filters their good-first-issue queues down to issues that:

- Have **no existing competing PRs** (configurable threshold)
- Have **no assignee**
- Are **not in a known bot-gated repo** (Expensify-style auto-close-on-unsolicited-PR)
- Are **not stale** (configurable max-age)

It scores remaining candidates by competition, recency, and repo size.

## Install

```sh
npm install -g gh-quest
```

You'll also need a GitHub personal access token with `public_repo` read scope, exported as `GITHUB_TOKEN`.

## Usage

```sh
gh-quest scan \
  --repos shadcn-ui/ui,vercel/next.js,prisma/prisma \
  --labels "good first issue,help wanted" \
  --max-existing-prs 1
```

### Flags

| Flag | Default | Description |
|---|---|---|
| `-r, --repos` | _(required)_ | Comma-separated `owner/name` list |
| `-l, --labels` | `good first issue,help wanted` | Labels to match (OR'd) |
| `--max-existing-prs` | `1` | Drop issues with more competing PRs than this |
| `--max-stale-days` | `180` | Drop issues with no activity for longer than this |
| `--include-bot-gated` | `false` | Include repos that auto-close unsolicited PRs |
| `--json` | `false` | Output JSON instead of a table |

## How the scoring works

Each issue starts at **100** and is penalized for signals of difficulty or contention:

| Signal | Effect |
|---|---|
| Existing competing PR | -40 per PR |
| No activity in 90+ days | -20 |
| No activity in 30+ days | -5 |
| Repo with 50k+ stars | +10 |
| Repo with 10k+ stars | +5 |

Score is clamped to `[0, +∞)`. Sort descending to pick first.

## Status

v0.1.0 — scanner working, scored, tested. Tested against mocked Octokit with 11 passing tests.

## License

MIT
