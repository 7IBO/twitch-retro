#!/usr/bin/env bun
// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
// Linear's issue ids stay in Linear, in the branch names and in the pull
// requests: no file of the repository names one, in code, comments, tests,
// fixtures or docs, and no path carries one. A comment says why the code is
// as it is, in its own words. The tests of the commit and title checker are
// the one exception: the format they check is their subject.
// Code does not point at a pull request or an issue either ("PR #NN",
// "issue #NN", their links): the reason goes in words. The docs may cite
// another project's pull requests and issues.
// `bun run check:ids`, and in CI on every pull request, docs included.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

// Adapt to the repository: the Linear team's key, the GitHub owners whose
// pull requests code may not cite, and the files allowed to name an id.

/** An issue id of the Linear team, in any case (a branch name is lowercase). */
export const ISSUE_ID = /(?<![a-z0-9])THI-\d+/gi

/** A pull request or an issue named by its number or its link, in code. */
export const PR_REFERENCE =
  /\b(?:PR|pull request|issue)s?:? {0,2}#\d+|github\.com\/(?:7IBO|inlinrhq)\/[\w.-]+\/(?:pull|issues)\/\d+/gi

/** Files allowed to name one, from the root of the repository. */
// docs/regles.md is a copy of the shared rules, which cite the issues of other apps.
export const EXEMPT = new Set(["scripts/commit-message.test.ts", "docs/regles.md"])

/** The ids a text names, each with its line. */
export function issueIds(
  text: string,
  pattern = ISSUE_ID
): { line: number; id: string }[] {
  const found: { line: number; id: string }[] = []
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(pattern))
      found.push({ line: i + 1, id: m[0] })
  })
  return found
}

/** Prose, where a citation of another project's pull request is fair. */
const isDoc = (file: string) => /\.mdx?$/.test(file)

/** A file whose first bytes hold a NUL is not text (an image, a font). */
const isBinary = (bytes: Buffer) => bytes.subarray(0, 8000).includes(0)

if (import.meta.main) {
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
  const findings: string[] = []
  for (const file of files) {
    if (EXEMPT.has(file)) continue
    for (const { id } of issueIds(file))
      findings.push(`${file}: ${id} in the path`)
    let bytes: Buffer
    try {
      bytes = readFileSync(file)
    } catch {
      continue // listed by git, deleted in the working tree
    }
    if (isBinary(bytes)) continue
    const text = bytes.toString("utf8")
    for (const { line, id } of issueIds(text))
      findings.push(`${file}:${line}: ${id}`)
    if (!isDoc(file))
      for (const { line, id } of issueIds(text, PR_REFERENCE))
        findings.push(`${file}:${line}: ${id}`)
  }
  if (findings.length > 0) {
    console.error(
      `check:ids: ${findings.length} Linear issue id(s) or pull request number(s) in the repository. ` +
        "Keep them in Linear, the branch and the pull request; say in words what the code needs.\n"
    )
    console.error(findings.join("\n"))
    process.exit(1)
  }
  console.log(`check:ids: no Linear issue id in ${files.length} files`)
}
