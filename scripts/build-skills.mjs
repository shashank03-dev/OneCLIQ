#!/usr/bin/env node
/**
 * Builds src/core/skills/catalog.json from skills/<domain>/<name>/SKILL.md, and checks every skill
 * against the Agent Skills open standard (https://agentskills.io/specification) on the way.
 *
 *   node scripts/build-skills.mjs          write the catalog
 *   node scripts/build-skills.mjs --check  fail if the catalog is stale or a skill is invalid (CI)
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(root, "skills");
const outFile = path.join(root, "src/core/skills/catalog.json");

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);

/** The small YAML subset SKILL.md frontmatter uses: `key: value` and one level of `metadata:` map. */
function parseFrontmatter(text, file) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) throw new Error(`${file}: missing YAML frontmatter`);
  const data = {};
  let map = null;
  for (const line of m[1].split("\n")) {
    if (!line.trim()) continue;
    const nested = /^ {2}([\w-]+):\s*(.*)$/.exec(line);
    if (nested && map) {
      map[nested[1]] = unquote(nested[2]);
      continue;
    }
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`${file}: can't parse frontmatter line "${line}"`);
    if (kv[2] === "") {
      map = data[kv[1]] = {};
    } else {
      map = null;
      data[kv[1]] = unquote(kv[2]);
    }
  }
  return { data, body: text.slice(m[0].length) };
}

const unquote = (v) => v.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

function validate(fm, dirName, file) {
  const errors = [];
  for (const key of Object.keys(fm)) if (!ALLOWED_KEYS.has(key)) errors.push(`unknown frontmatter field "${key}"`);
  if (!fm.name || fm.name.length > 64 || !NAME_RE.test(fm.name)) errors.push("name must be 1-64 lowercase letters, digits and single hyphens");
  if (fm.name !== dirName) errors.push(`name "${fm.name}" must match its folder "${dirName}"`);
  if (!fm.description || fm.description.length > 1024) errors.push("description must be 1-1024 characters");
  if (fm.compatibility && fm.compatibility.length > 500) errors.push("compatibility must be at most 500 characters");
  if (!fm.metadata?.domain) errors.push("metadata.domain is required in this library");
  if (errors.length) throw new Error(`${file}:\n  - ${errors.join("\n  - ")}`);
}

const skills = [];
for (const domain of readdirSync(skillsDir).sort()) {
  const domainDir = path.join(skillsDir, domain);
  if (!statSync(domainDir).isDirectory()) continue;
  for (const name of readdirSync(domainDir).sort()) {
    const file = path.join(domainDir, name, "SKILL.md");
    if (!existsSync(file)) continue;
    const rel = path.relative(root, file);
    const content = readFileSync(file, "utf8");
    const { data, body } = parseFrontmatter(content, rel);
    validate(data, name, rel);
    if (data.metadata.domain !== domain) throw new Error(`${rel}: metadata.domain "${data.metadata.domain}" must match folder "${domain}"`);
    const lines = body.split("\n").length;
    if (lines > 500) throw new Error(`${rel}: keep SKILL.md under 500 lines (has ${lines})`);
    const title = /^#\s+(.+)$/m.exec(body)?.[1] ?? name;
    skills.push({
      name,
      title,
      domain,
      description: data.description,
      ...(data.compatibility ? { compatibility: data.compatibility } : {}),
      version: data.metadata.version ?? "1.0",
      path: rel.split(path.sep).join("/"),
      content,
    });
  }
}

const json = `${JSON.stringify({ skills }, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
  if (current !== json) {
    console.error("src/core/skills/catalog.json is out of date. Run: npm run skills:build");
    process.exit(1);
  }
  console.log(`${skills.length} skills valid, catalog up to date.`);
} else {
  writeFileSync(outFile, json);
  console.log(`Wrote ${skills.length} skills to ${path.relative(root, outFile)}`);
}
