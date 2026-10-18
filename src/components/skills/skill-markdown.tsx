import { cn } from "@/lib/cn";

type Kind = "fence" | "front" | "code" | "heading" | "h1" | "table" | "list" | "text";

/** Tag each line of a SKILL.md with what it is: frontmatter, code, heading, table, list or text. */
function classify(source: string): Array<{ line: string; kind: Kind }> {
  const out: Array<{ line: string; kind: Kind }> = [];
  let fences = 0;
  let inCode = false;
  for (const line of source.split("\n")) {
    let kind: Kind = "text";
    if (line === "---" && fences < 2) {
      fences++;
      kind = "fence";
    } else if (fences === 1) kind = "front";
    else if (line.startsWith("```")) {
      inCode = !inCode;
      kind = "fence";
    } else if (inCode) kind = "code";
    else if (line.startsWith("# ")) kind = "h1";
    else if (/^#{2,6}\s/.test(line)) kind = "heading";
    else if (line.startsWith("|")) kind = "table";
    else if (/^\s*(?:[-*]|\d+\.)\s/.test(line)) kind = "list";
    out.push({ line, kind });
  }
  return out;
}

const KIND_CLASS: Record<Kind, string> = {
  fence: "text-night-muted/60",
  front: "",
  code: "text-leaf/90",
  heading: "font-semibold text-night-ink",
  h1: "font-semibold text-night-ink text-[14px]",
  table: "text-night-muted",
  list: "",
  text: "",
};

/**
 * Shows a SKILL.md as the file it is, lightly tinted: frontmatter keys, headings, code and tables.
 * Deliberately not a full Markdown renderer: what you see is exactly what gets installed.
 */
export function SkillMarkdown({ source }: { source: string }) {
  return (
    <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-[1.75] text-night-ink/85 [overflow-wrap:anywhere]">
      <code>
        {classify(source).map(({ line, kind }, i) => {
          let content: React.ReactNode = line;
          if (kind === "front") {
            const m = /^(\s*[\w-]+:)(.*)$/.exec(line);
            if (m)
              content = (
                <>
                  <span className="text-lilac">{m[1]}</span>
                  <span className="text-night-muted">{m[2]}</span>
                </>
              );
          } else if (kind === "list") {
            const m = /^(\s*(?:[-*]|\d+\.))(\s.*)$/.exec(line)!;
            content = (
              <>
                <span className="text-ember">{m[1]}</span>
                {m[2]}
              </>
            );
          }
          return (
            <span key={i} className={cn("block min-h-[1.75em]", KIND_CLASS[kind])}>
              {content}
            </span>
          );
        })}
      </code>
    </pre>
  );
}
