import { GitHubClient } from "@/core/github";
import { githubConfig } from "./config";

let client: GitHubClient | undefined;

/** Server-only GitHub client. The token never leaves this process. */
export function getGitHubClient(): GitHubClient {
  if (!client) {
    client = new GitHubClient({
      ...githubConfig(),
      // The server's token may be able to read the owner's private repos; visitors must never see them.
      publicOnly: true,
      timeoutMs: 8000,
      userAgent: "onecliq-web",
    });
  }
  return client;
}
