#!/usr/bin/env node
// Renders Vitest's coverage/coverage-summary.json (the `json-summary` reporter) as a Markdown
// report on stdout. CI appends it to the job summary and posts it as a sticky PR comment, so
// coverage is visible without a third-party service.
//
// Usage:
//   node scripts/coverage-report.mjs [path/to/coverage-summary.json]

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

// First line of the PR comment; CI uses it to find and update the existing comment.
const MARKER = "<!-- stadje-coverage-report -->";

const METRICS = ["lines", "statements", "functions", "branches"];

const summaryPath =
  process.argv[2] ?? join(process.cwd(), "coverage", "coverage-summary.json");
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));

function pct(metric) {
  return `${metric.pct.toFixed(2)}%`;
}

function icon(value) {
  if (value >= 90) return "🟢";
  if (value >= 75) return "🟡";
  return "🔴";
}

const lines = [MARKER, "## Coverage report", ""];

lines.push("| Metric | Coverage | Covered / Total |");
lines.push("| --- | --- | --- |");
for (const key of METRICS) {
  const m = summary.total[key];
  lines.push(
    `| ${icon(m.pct)} ${key} | ${pct(m)} | ${m.covered} / ${m.total} |`,
  );
}

const files = Object.entries(summary)
  .filter(([file]) => file !== "total")
  .map(([file, data]) => [relative(process.cwd(), file), data])
  .sort(([, a], [, b]) => a.lines.pct - b.lines.pct);

lines.push(
  "",
  "<details><summary>Per-file coverage (lowest line coverage first)</summary>",
  "",
);
lines.push("| File | Lines | Statements | Functions | Branches |");
lines.push("| --- | --- | --- | --- | --- |");
for (const [file, data] of files) {
  lines.push(
    `| \`${file}\` | ${METRICS.map((k) => pct(data[k])).join(" | ")} |`,
  );
}
lines.push("", "</details>");

process.stdout.write(`${lines.join("\n")}\n`);
