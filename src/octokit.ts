import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import chalk from "chalk";

const ThrottledOctokit = Octokit.plugin(throttling);

const MAX_PRIMARY_RETRIES = 2;

export interface CreateOctokitOptions {
  auth?: string;
  /** Whether to print warnings when rate-limited. Defaults to true. */
  warnOnThrottle?: boolean;
}

/**
 * Build an Octokit instance that handles GitHub's primary and secondary rate limits gracefully.
 *
 * - Primary rate limit (auth-quota exhausted): retries up to MAX_PRIMARY_RETRIES times, then gives up.
 * - Secondary rate limit (abuse detection): always retries, since the server tells us exactly when.
 */
export function createOctokit(options: CreateOctokitOptions = {}): Octokit {
  const warn = options.warnOnThrottle ?? true;

  return new ThrottledOctokit({
    auth: options.auth,
    throttle: {
      onRateLimit: (retryAfter, requestOptions, _octokit, retryCount) => {
        if (warn) {
          console.warn(
            chalk.yellow(
              `rate limit hit on ${requestOptions.method} ${requestOptions.url}; ` +
                `retry ${retryCount + 1}/${MAX_PRIMARY_RETRIES} after ${retryAfter}s`,
            ),
          );
        }
        return retryCount < MAX_PRIMARY_RETRIES;
      },
      onSecondaryRateLimit: (retryAfter, requestOptions) => {
        if (warn) {
          console.warn(
            chalk.yellow(
              `secondary rate limit on ${requestOptions.method} ${requestOptions.url}; ` +
                `retrying after ${retryAfter}s`,
            ),
          );
        }
        return true;
      },
    },
  });
}
