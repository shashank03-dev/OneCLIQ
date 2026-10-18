import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseGitHubUrl } from "@/core/parse-url";
import { Resolver } from "@/components/resolver";
import { SiteNav } from "@/components/sections/site-nav";
import { SiteFooter } from "@/components/sections/site-footer";

export const metadata: Metadata = {
  title: "Your download — OneCLIQ",
  description: "Get the latest stable GitHub release for your computer. OneCLIQ detects your system and starts the right download.",
  robots: { index: false, follow: true },
};

async function Download({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  try {
    const target = parseGitHubUrl(`https://github.com/${owner}/${repo}`);
    if (target.owner !== owner || target.repo !== repo) notFound();
  } catch { notFound(); }
  return (
    <>
      <h1 className="text-balance text-center font-serif text-4xl sm:text-5xl">Download {owner}/{repo}</h1>
      <p className="mb-8 mt-4 text-center text-ink-muted">The latest stable release, matched to your computer by OneCLIQ.</p>
      <Resolver initialUrl={`https://github.com/${owner}/${repo}`} autoDownload />
      <noscript><p>Enable JavaScript to detect your system, or <a href={`https://github.com/${owner}/${repo}/releases/latest`}>browse the latest release on GitHub</a>.</p></noscript>
    </>
  );
}

export default function GetPage(props: { params: Promise<{ owner: string; repo: string }> }) {
  return (
    <>
      <Suspense fallback={<div className="h-16" />}><SiteNav /></Suspense>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-5 pb-20 pt-32 sm:px-8">
        <Suspense fallback={<p role="status">Preparing your download…</p>}><Download params={props.params} /></Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
