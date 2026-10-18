import { GitHubClient } from "@/core/github";
import { githubConfig } from "./config";

let client: GitHubClient | undefined;

/** Server-only GitHub client. The token never leaves this process. */
export function getGitHubClient(): GitHubClient {
  if (!client) {
    client = new GitHubClient({
      ...githubConfig(),
      timeoutMs: 8000,
      userAgent: "onecliq-web",
    });
  }
  return client;
}
