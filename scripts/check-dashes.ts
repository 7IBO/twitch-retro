#!/usr/bin/env bun
// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
// No long dash in the docs: the dash (—) used as a pause is the first sign
// of a text that reads as machine-written. A sentence takes a colon, a
// comma, a period or parentheses instead. The en dash (–) between two words
// is the same pause and is refused too; between two numbers it is a range
// and stays. A quote keeps its own punctuation: what stands between double
// quotes, French quotes or backticks on one line, or in a fenced code
// block, is not read (scripts/pause-dash.ts, one rule for every check).
// Interface texts are checked by `check-copy.ts`, a commit's message by
// `scripts/commit-message.ts`.
// `bun run check:dashes`, and in CI on every pull request, docs included.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { pauseLines } from "./pause-dash"

if (import.meta.main) {
  const files = execFileSync("git", ["ls-files", "-z", "*.md", "*.mdx"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
  const findings: string[] = []
  for (const file of files) {
    let text: string
    try {
      text = readFileSync(file, "utf8")
    } catch {
      continue // listed by git, deleted in the working tree
    }
    for (const { line, text: content } of pauseLines(text))
      findings.push(`${file}:${line}: ${content.slice(0, 160)}`)
  }
  if (findings.length > 0) {
    console.error(
      `check:dashes: ${findings.length} line(s) use a dash as a pause. ` +
        "Write a colon, a comma, a period or parentheses instead.\n"
    )
    console.error(findings.join("\n"))
    process.exit(1)
  }
  console.log(`check:dashes: no dash used as a pause in ${files.length} files`)
}
