import { VirusTotalClient } from "@/core/virustotal";

let client: VirusTotalClient | undefined;

/** Server-only VirusTotal client. The key never leaves this process. */
export function getVirusTotalClient(): VirusTotalClient {
  if (!client) {
    client = new VirusTotalClient({
      apiKey: process.env.VIRUSTOTAL_API_KEY?.trim() || undefined,
      // Test-only override (points e2e runs at a local mock). Never derived from requests.
      apiBase: process.env.VIRUSTOTAL_API_BASE_URL?.trim() || undefined,
      timeoutMs: 8000,
      userAgent: "onecliq-web",
    });
  }
  return client;
}
