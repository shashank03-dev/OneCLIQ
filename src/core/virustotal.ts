/**
 * Minimal VirusTotal client for file-hash reputation.
 *
 * Only a SHA-256 hash leaves this process — never file contents. Request URLs are built
 * from validated hex digests against a fixed API base; user input is never fetched directly.
 *
 * The free public API allows about 4 lookups/minute and 500/day. A conservative in-process
 * budget keeps us under both; a short cache absorbs repeats. Everything here fails soft:
 * "couldn't ask" is `null`, not an exception, because this is one signal, not the whole flow.
 */
import { z } from "zod";
import { TtlCache } from "./cache";

export const DEFAULT_VT_API_BASE = "https://www.virustotal.com/api/v3";

/** One engine's verdict, kept only for malicious/suspicious results. */
export interface VirusTotalDetection {
  engine: string;
  result: string;
  category: "malicious" | "suspicious";
}

/** What VirusTotal knows about one file hash. */
export interface VirusTotalFileReport {
  /** true = engines have seen these bytes; false = this hash is unknown to VirusTotal. */
  found: boolean;
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  /** Engines that reported a detection, malicious first. At most 12. */
  detections: VirusTotalDetection[];
  /** ISO date of the last analysis, when VirusTotal reports one. */
  lastAnalysis?: string;
}

export interface VirusTotalClientOptions {
  apiKey?: string;
  /** Override for tests only (e.g. a local mock server). */
  apiBase?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  userAgent?: string;
  cache?: TtlCache<VirusTotalFileReport>;
  cacheTtlMs?: number;
  /** Outbound free-tier budget. Defaults follow the public API limits. */
  maxPerMinute?: number;
  maxPerDay?: number;
  /** Clock override for tests. */
  now?: () => number;
}

const StatsSchema = z
  .object({
    malicious: z.number(),
    suspicious: z.number(),
    harmless: z.number(),
    undetected: z.number(),
  })
  .passthrough();

const AnalysisResultSchema = z
  .object({
    category: z.string(),
    result: z.string().max(200).nullable().optional(),
    engine_name: z.string().max(100).optional(),
  })
  .passthrough();

const FileReportSchema = z.object({
  data: z.object({
    attributes: z
      .object({
        last_analysis_stats: StatsSchema,
        last_analysis_results: z.record(z.string(), AnalysisResultSchema).optional(),
        last_analysis_date: z.number().optional(),
      })
      .passthrough(),
  }),
});

/** Rolling-window budget shared by all lookups from one client instance. */
class LookupBudget {
  private readonly minute: number[] = [];
  private readonly day: number[] = [];

  constructor(
    private readonly maxPerMinute: number,
    private readonly maxPerDay: number,
    private readonly now: () => number,
  ) {}

  take(): boolean {
    const t = this.now();
    while (this.minute.length > 0 && t - this.minute[0] >= 60_000) this.minute.shift();
    while (this.day.length > 0 && t - this.day[0] >= 86_400_000) this.day.shift();
    if (this.minute.length >= this.maxPerMinute || this.day.length >= this.maxPerDay) return false;
    this.minute.push(t);
    this.day.push(t);
    return true;
  }
}

const sharedCache = new TtlCache<VirusTotalFileReport>(500);

export class VirusTotalClient {
  private readonly apiBase: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
  private readonly cache: TtlCache<VirusTotalFileReport>;
  private readonly cacheTtlMs: number;
  private readonly budget: LookupBudget;
  private readonly pending = new Map<string, Promise<VirusTotalFileReport | null>>();

  constructor(opts: VirusTotalClientOptions = {}) {
    this.apiBase = (opts.apiBase || DEFAULT_VT_API_BASE).replace(/\/+$/, "");
    this.apiKey = opts.apiKey || undefined;
    this.timeoutMs = opts.timeoutMs ?? 8000;
    this.fetchImpl = opts.fetch ?? fetch;
    this.userAgent = opts.userAgent ?? "onecliq";
    this.cache = opts.cache ?? sharedCache;
    this.cacheTtlMs = opts.cacheTtlMs ?? 30 * 60_000;
    this.budget = new LookupBudget(opts.maxPerMinute ?? 4, opts.maxPerDay ?? 500, opts.now ?? Date.now);
  }

  /** False when no API key is configured: lookups would be pointless, callers can say why. */
  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Reputation for one file hash. Accepts "sha256:<hex>" or plain hex.
   * Returns null when VirusTotal can't be asked right now (no key, budget reached, rate
   * limit, timeout, network): that means "unknown", not "clean", and is never cached.
   */
  async lookupHash(sha256: string): Promise<VirusTotalFileReport | null> {
    const hex = sha256.replace(/^sha256:/i, "").toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hex)) throw new Error("Expected a SHA-256 hex digest.");

    const cached = this.cache.get(hex);
    if (cached) return cached;
    const pending = this.pending.get(hex);
    if (pending) return pending;
    if (!this.apiKey || !this.budget.take()) return null;

    const request = this.fetchReport(hex).finally(() => this.pending.delete(hex));
    this.pending.set(hex, request);
    return request;
  }

  private async fetchReport(hex: string): Promise<VirusTotalFileReport | null> {
    let report: VirusTotalFileReport | null = null;
    try {
      const res = await this.fetchImpl(`${this.apiBase}/files/${hex}`, {
        headers: { Accept: "application/json", "x-apikey": this.apiKey!, "User-Agent": this.userAgent },
        redirect: "follow",
        signal: AbortSignal.timeout(this.timeoutMs),
        cache: "no-store",
      });
      if (res.status === 404) {
        report = { found: false, malicious: 0, suspicious: 0, harmless: 0, undetected: 0, detections: [] };
      } else if (res.ok) {
        const parsed = FileReportSchema.safeParse(await res.json());
        if (parsed.success) report = toFileReport(parsed.data);
      }
    } catch {
      report = null;
    }

    // Cache answers only; "couldn't ask" should be retried next time.
    if (report) this.cache.set(hex, report, this.cacheTtlMs);
    return report;
  }
}

function toFileReport(raw: z.infer<typeof FileReportSchema>): VirusTotalFileReport {
  const attrs = raw.data.attributes;
  const stats = attrs.last_analysis_stats;
  const detections: VirusTotalDetection[] = Object.entries(attrs.last_analysis_results ?? {})
    .filter(([, r]) => (r.category === "malicious" || r.category === "suspicious") && r.result)
    .map(([key, r]) => ({
      engine: r.engine_name || key,
      result: r.result!,
      category: r.category as "malicious" | "suspicious",
    }))
    .sort((a, b) => (a.category === b.category ? 0 : a.category === "malicious" ? -1 : 1))
    .slice(0, 12);

  const date = attrs.last_analysis_date;
  return {
    found: true,
    malicious: stats.malicious,
    suspicious: stats.suspicious,
    harmless: stats.harmless,
    undetected: stats.undetected,
    detections,
    lastAnalysis: typeof date === "number" && Number.isFinite(date) ? new Date(date * 1000).toISOString() : undefined,
  };
}
