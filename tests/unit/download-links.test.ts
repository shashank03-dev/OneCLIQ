import { describe, expect, it } from "vitest";
import { createDownloadLinks, downloadOrigin } from "@/lib/download-links";

describe("download links", () => {
  it("uses the configured first-party origin and discards paths", () => {
    expect(downloadOrigin("https://downloads.example.com/path/", "https://preview.example.com")).toBe("https://downloads.example.com");
    expect(downloadOrigin(undefined, "http://localhost:3000/download")).toBe("http://localhost:3000");
    expect(downloadOrigin("javascript:alert(1)", "https://example.com")).toBe("https://example.com");
    expect(downloadOrigin("https://user:pass@evil.example", "https://example.com")).toBe("https://example.com");
    expect(() => downloadOrigin(undefined, "http://example.com")).toThrow();
  });

  it("creates universal, direct, and embedded links on the same domain", () => {
    const links = createDownloadLinks("https://onecliq.example", { owner: "cli", name: "cli" }, { os: "windows", arch: "arm64" });
    expect(links.universal).toBe("https://onecliq.example/get/cli/cli");
    expect(links.direct).toBe("https://onecliq.example/api/download?repo=cli%2Fcli&os=windows&arch=arm64");
    expect(links.html).toBe('<a href="https://onecliq.example/get/cli/cli"><img src="https://onecliq.example/download-badge.svg" alt="Download cli/cli with OneCLIQ" width="196" height="36"></a>');
    expect(links.markdown).toBe("[![Download cli/cli with OneCLIQ](https://onecliq.example/download-badge.svg)](https://onecliq.example/get/cli/cli)");
    expect(links.universal).not.toContain("arch=");
  });

  it("refuses invalid repository names instead of injecting embed markup", () => {
    expect(() => createDownloadLinks("https://onecliq.example", { owner: '<script>', name: 'x"' }, { os: "linux", arch: "x64" })).toThrow();
  });
});
