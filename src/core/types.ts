export const OS_VALUES = ["windows", "macos", "linux"] as const;
export const ARCH_VALUES = ["x64", "arm64", "x86"] as const;

export type Os = (typeof OS_VALUES)[number];
export type Arch = (typeof ARCH_VALUES)[number];

export interface Platform {
  os: Os;
  arch: Arch;
}

/** What a user pasted, reduced to the only parts we ever use. */
export interface RepoTarget {
  owner: string;
  repo: string;
  /** Present only when the URL pointed at a specific release. */
  tag?: string;
}

export interface ReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
  contentType?: string;
  /** e.g. "sha256:abc…" when GitHub provides it. */
  digest?: string;
  createdAt?: string;
  updatedAt?: string;
  /** GitHub login that uploaded the file. */
  uploader?: string;
}

export interface Release {
  name: string;
  tag: string;
  htmlUrl: string;
  publishedAt: string | null;
  prerelease: boolean;
  draft: boolean;
  /** GitHub immutable release: assets and tag are locked once published. */
  immutable?: boolean;
  /** GitHub login that published the release. */
  author?: string;
  assets: ReleaseAsset[];
}

/** Coarse, user-facing description of what kind of file an asset is. */
export type AssetKind = "installer" | "package" | "portable" | "archive";

export type NoMatchReason = "no-assets" | "source-only" | "no-compatible" | "ambiguous";

export type ErrorCode =
  | "INVALID_URL"
  | "INVALID_REQUEST"
  | "REPO_NOT_FOUND"
  | "RELEASE_NOT_FOUND"
  | "NO_RELEASES"
  | "NO_STABLE_RELEASE"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK"
  | "UPSTREAM"
  | "PR_NOT_FOUND"
  | "AI_NOT_CONFIGURED"
  | "AI_ERROR"
  | "AI_RATE_LIMITED";

export interface ResolvedAsset {
  name: string;
  size: number;
  downloadUrl: string;
  kind: AssetKind;
  /** Short format label such as "DMG", "MSI", "AppImage". */
  format: string;
  digest?: string;
}

export type Recommendation =
  | { status: "recommended"; asset: ResolvedAsset }
  | { status: "not-recommended"; reason: NoMatchReason };

export interface ResolveSuccess {
  ok: true;
  repo: { owner: string; name: string; url: string };
  release: {
    name: string;
    tag: string;
    url: string;
    publishedAt: string | null;
    prerelease: boolean;
  };
  platform: Platform;
  recommendation: Recommendation;
}

export interface ResolveFailure {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    /** Seconds until a retry is likely to work (rate limits). */
    retryAfter?: number;
  };
}

export type ResolveResponse = ResolveSuccess | ResolveFailure;
