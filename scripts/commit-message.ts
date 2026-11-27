#!/usr/bin/env bun
// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
// The commit and pull request conventions (docs/regles.md, Git): a
// Conventional Commits header in English, a branch named after its Linear
// issue, no dash used as a pause in a message or a title, and no line that
// credits an AI assistant. No dependency but the dash rule
// (./pause-dash.ts), so that the same rules run in the commit-msg hook
// (.githooks/commit-msg) and in CI, where the pull request's title becomes
// the squash commit.
//
//   bun scripts/commit-message.ts <file>        a commit message (the hook)
//   bun scripts/commit-message.ts --title "…"   a pull request's title
//   bun scripts/commit-message.ts --branch "…"  a branch name
//   bun scripts/commit-message.ts --body <file>  a pull request's body or a pushed commit (credits, dashes)
import { readFileSync } from "node:fs"

import { hasPause, pauseLines, QUOTED } from "./pause-dash"

export const TYPES = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "docs",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
  "style",
] as const

/** A squash title carries its issue, `(THI-NN)`, so it may be longer. */
const MAX_COMMIT_HEADER = 72
const MAX_TITLE = 100

const HEADER = new RegExp(
  `^(${TYPES.join("|")})(\\([a-z0-9][a-z0-9/,-]*\\))?(!)?: (\\S.*)$`
)

/** Headers git or GitHub write themselves: kept as they are. */
const GENERATED =
  /^(Merge (branch|pull request|remote-tracking branch|commit|tag) |Revert "|fixup! |squash! |amend! )/

/** `git commit -v` puts the diff below this line: it is not the message. */
const SCISSORS = /^# -+ >8 -+$/m

/**
 * Credits to an AI assistant, refused anywhere in a message, a title or a
 * pull request's body: a trailer naming one, the footers assistants write.
 * Mentions in prose (a commit about this very check) stay allowed.
 */
const ATTRIBUTION = [
  /^(co-authored-by|assisted-by|generated-by|signed-off-by):.*(claude|anthropic|copilot|chatgpt|openai|gemini|cursor)/im,
  /^[a-z-]+-by:.*noreply@anthropic\.com/im,
  /^claude-session:/im,
  /generated (with|by) \[?claude/i,
  /claude\.(ai|com)\/code/i,
  /noreply@anthropic\.com/i,
  /claude-projects-attribution/i,
  /_requested by \*\*/i,
]

// Adapt to the repository: where its Git rules are written, the branch
// names it accepts, and whether a pull request's title must end with its
// Linear issue. Keep the flags an existing CI or hook already passes.

/** The file a refusal points to. */
const RULES = "docs/regles.md, Git"

/**
 * The branch Linear gives an issue (gitBranchName, `<user>/thi-NN-…`), or
 * GitHub's Revert button's. A repository without Linear issues (socle,
 * marketing) adds `^(feat|fix|docs|chore|refactor)\/[a-z0-9-]+$`.
 */
const BRANCH =
  /^(revert-\d+-)?[a-z0-9-]+\/thi-\d+-[a-z0-9_-]+$/
/** A squash title ends with its issue, as in `(THI-NN)`. */
const TITLE_ISSUE: RegExp | null = /\(THI-\d+\)$/

export function checkAttribution(text: string) {
  return ATTRIBUTION.some((rule) => rule.test(text))
    ? [`it credits an AI assistant: no attribution, anywhere (${RULES})`]
    : []
}

function header(line: string, max: number) {
  const problems: string[] = []
  const match = HEADER.exec(line)
  if (!match) {
    problems.push(
      `"${line}" is not "type(scope): summary", with type one of ${TYPES.join(", ")}`
    )
    return problems
  }
  if (line.length > max)
    problems.push(`the header is ${line.length} characters, ${max} at most`)
  if (/\.$/.test(match[4]!)) problems.push("the summary ends with a period")
  return problems
}

/**
 * A commit message as git hands it to the hook (Windows line endings
 * included): comments and anything below the scissors line are dropped.
 */
export function checkCommitMessage(message: string) {
  const text = message
    .replace(/\r\n?/g, "\n")
    .split(SCISSORS)[0]!
    .split("\n")
    .filter((l) => !l.startsWith("#"))
    .join("\n")
    .trim()
  const lines = text.split("\n")
  const first = lines[0] ?? ""
  if (GENERATED.test(first)) return checkAttribution(text)
  const problems = [
    ...header(first, MAX_COMMIT_HEADER),
    ...checkAttribution(text),
  ]
  if (lines.length > 1 && lines[1] !== "")
    problems.push("a blank line separates the header from the body")
  if (pauseLines(text).length > 0)
    problems.push(
      "a dash used as a pause: write a colon, a comma, a period or parentheses"
    )
  return problems
}

/** A pull request's title, which becomes the squash commit's header. */
export function checkTitle(title: string) {
  if (/^Revert "/.test(title)) return checkAttribution(title)
  const problems = [...header(title, MAX_TITLE), ...checkAttribution(title)]
  if (hasPause(title.replace(QUOTED, "")))
    problems.push(
      "a dash used as a pause: write a colon, a comma, a period or parentheses"
    )
  if (TITLE_ISSUE && !TITLE_ISSUE.test(title))
    problems.push('the title ends with its Linear issue, as in "(THI-NN)"')
  return problems
}

/** A pull request's body: its Summary becomes the squash commit's message. */
export function checkBody(body: string) {
  const problems = checkAttribution(body)
  // The template's comments are the template's words.
  const lines = pauseLines(
    body.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ""))
  )
  if (lines.length > 0)
    problems.push(
      `a dash used as a pause (line ${lines.map((l) => l.line).join(", ")}): write a colon, a comma, a period or parentheses`
    )
  return problems
}

export function checkBranch(branch: string) {
  if (/^claude\//.test(branch))
    return [`"${branch}" is an assistant's branch: copy the issue's gitBranchName`]
  return BRANCH.test(branch)
    ? []
    : [
        `"${branch}" is not a Linear branch name (<user>/thi-NN-…): copy the issue's gitBranchName`,
      ]
}

if (import.meta.main) {
  const [flag, value] = process.argv.slice(2)
  const problems =
    flag === "--title"
      ? checkTitle(value ?? "")
      : flag === "--branch"
        ? checkBranch(value ?? "")
        : flag === "--body"
          ? checkBody(readFileSync(value ?? 0, "utf8"))
          : flag
            ? checkCommitMessage(readFileSync(flag, "utf8"))
            : [
                "usage: commit-message.ts <file> | --title <title> | --branch <name> | --body <file>",
              ]
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✗ ${problem}`)
    console.error(`See ${RULES}.`)
    process.exit(1)
  }
}
