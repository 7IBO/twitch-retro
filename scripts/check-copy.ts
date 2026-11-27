#!/usr/bin/env bun
// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
// The words that make a text read as machine-written: hype, filler
// adverbs, stock phrases of assistants, emoji, and in the interface's
// texts an exclamation mark and a dash used as a pause (the docs' dashes
// are check-dashes.ts's). This file holds the one list of these words: the
// writing rules point to it. In Markdown, what stands between quotes or
// backticks, and in a fenced code block, is not read, so a rule names a
// word it refuses in a code span. In interface files, only the texts are
// read: string literals and the text between JSX tags.
// `bun run check:copy`, and in CI with the lint.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { hasPause, QUOTED } from "./pause-dash"

// Adapt to the repository: where the interface's texts live (messages
// files, and the components when the copy is written in them), and the
// files that may keep a word (a vendored text, a test).
export const MARKDOWN = /\.mdx?$/
export const INTERFACE = [
  /(^|\/)src\/lib\/i18n\/.*\.ts$/,
  /(^|\/)src\/(pages|components)\/.*\.svelte$/,
]
export const EXEMPT = [
  /(^|\/)upstream\//, // a vendored text keeps its author's words
  /(^|\/)CHANGELOG\.md$/,
]

/** Words that sell instead of saying, English and French. */
export const HYPE =
  /(?<![\p{L}-])(seamless(ly)?|supercharg\p{L}*|effortless(ly)?|revolutioni[sz]\p{L}*|revolutionary|game[- ]changers?|unleash\p{L}*|leverag\p{L}*|empower\p{L}*|cutting[- ]edge|next-level|best[- ]in[- ]class|world[- ]class|ai[- ]powered|magical|robust|elevate|delve|powerful|révolutionn\p{L}*|incroyables?|magiques?|ultimes?|sans effort|inégalée?s?|découvrez|boostez|fluides?|fluidité|puissante?s?|clé en main)(?![\p{L}-])/iu

/** Adverbs that fill a sentence and say nothing. */
export const FILLER =
  /(?<![\p{L}-])(actually|really|simply|basically|truly|honestly|seamlessly|vraiment|simplement|honnêtement|littéralement|clairement|véritablement|tout simplement)(?![\p{L}-])/iu

/** Turns of phrase an assistant reaches for. */
export const STOCK = [
  /\.\s+(Jamais|Never|Point final|Period)\.(\s|$)/u,
  /z[ée]ro (maintenance|friction|effort|config\p{L}*)/iu,
  /(ravi|heureux|fier) d['’]annoncer|thrilled to (announce|share)|excited to (announce|share)/iu,
  /in today['’]s (fast[- ]paced|digital)|dans un monde où|à l['’]ère d[eu]/iu,
  /let['’]s dive|plongeons|sans plus attendre|without further ado/iu,
  /(it['’]s|this is) not just|plus qu['’]un(e)? simple/iu,
  /par construction|by design, not by accident/iu,
  /unlock (your|the (power|full)|new)|débloquez (votre|tout)/iu, // the verb sells; the noun (an unlock) is a fact
]

/** An emoji, with the variation selector that turns a symbol into one. */
export const EMOJI =
  /\p{Emoji_Presentation}|[\u{1F000}-\u{1FAFF}\u{FE0F}]/u

export type Finding = { line: number; rule: string; text: string }

/** The texts of a line of code: string literals and JSX text. */
export function codeTexts(line: string, jsx = false): string[] {
  const texts: string[] = []
  // A JSX text wrapped onto its own line by the formatter.
  const keyword = /^\s*(return|const|let|var|if|else|for|while|switch|case|default|break|continue|throw|try|catch|finally|export|import|function|async|await|type|interface|enum|new|yield)\b/
  if (
    jsx &&
    !keyword.test(line) &&
    /^\s*[^<>{}=();:"'`]*\p{L}[^<>{}=();"'`]*$/u.test(line) &&
    /\s\S/.test(line.trim())
  )
    return [line]
  line = line.replace(/\{[^{}]*\}/g, " 0 ")
  for (const m of line.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`]*)`/g))
    texts.push((m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " 0 "))
  for (const m of line.matchAll(/>([^<>{}]*\p{L}[^<>{}]*)</gu)) texts.push(m[1]!)
  return texts.filter((t) => /\p{L}/u.test(t))
}

/** The rules a piece of text breaks. */
function broken(text: string, ui: boolean): string[] {
  const rules: string[] = []
  if (HYPE.test(text)) rules.push("a hype word: say what the thing does")
  if (FILLER.test(text)) rules.push("a filler adverb: cut it")
  if (STOCK.some((re) => re.test(text))) rules.push("a stock phrase: say it plainly")
  if (EMOJI.test(text)) rules.push("an emoji: an icon of the design system, or nothing")
  // After a word, French no-break space allowed; not a Tailwind `x-y!`.
  if (ui && /(^|\s)[^\s:\[\]\/-]*\p{L}[\s\u00a0\u202f]?[!¡！]+(\s|$)/u.test(text))
    rules.push("an exclamation mark: a sentence says, it does not exclaim")
  if (ui && hasPause(text))
    rules.push("a dash used as a pause: a comma, a colon, a period or parentheses")
  return rules
}

/**
 * What a text breaks, line by line. `ui`: a file of interface texts, whose
 * strings are read; otherwise Markdown, whose quotes and code are not.
 */
export function copyFindings(
  text: string,
  { ui = false, jsx = false } = {}
): Finding[] {
  const found: Finding[] = []
  let fence: string | null = null
  let comment = false
  text.split("\n").forEach((raw, i) => {
    if (ui) {
      // Comments are the code's, not the interface's: skip /* … */ blocks.
      if (comment) {
        if (raw.includes("*/")) comment = false
        return
      }
      if (/^\s*\{?\/\*/.test(raw) && !raw.includes("*/")) {
        comment = true
        return
      }
      if (/^\s*(\/\/|\*|\{?\/\*|import |export \* )/.test(raw)) return
    } else {
      const marker = /^\s*(`{3,}|~{3,})/.exec(raw)?.[1]
      if (marker && (fence === null || marker.startsWith(fence))) {
        fence = fence === null ? marker : null
        return
      }
      if (fence !== null) return
    }
    // A line that keeps a word on purpose says why: `// copy: <reason>`.
    if (/\/\/ copy: \S/.test(raw) || /<!-- copy: \S/.test(raw)) return
    const pieces = ui ? codeTexts(raw, jsx) : [raw.replace(QUOTED, "")]
    const rules = new Set(pieces.flatMap((p) => broken(p, ui)))
    for (const rule of rules)
      found.push({ line: i + 1, rule, text: raw.trim().slice(0, 160) })
  })
  return found
}

if (import.meta.main) {
  const files = execFileSync(
    "git",
    ["ls-files", "-z"],
    { encoding: "utf8" }
  )
    .split("\0")
    .filter((f) => f && !EXEMPT.some((re) => re.test(f)))
    .filter((f) => MARKDOWN.test(f) || INTERFACE.some((re) => re.test(f)))
  const findings: string[] = []
  for (const file of files) {
    let text: string
    try {
      text = readFileSync(file, "utf8")
    } catch {
      continue // listed by git, deleted in the working tree
    }
    const ui = INTERFACE.some((re) => re.test(file))
    for (const f of copyFindings(text, { ui, jsx: file.endsWith(".tsx") }))
      findings.push(`${file}:${f.line}: ${f.rule}\n  ${f.text}`)
  }
  if (findings.length > 0) {
    console.error(`check:copy: ${findings.length} line(s) read as machine-written\n`)
    console.error(findings.join("\n"))
    process.exit(1)
  }
  console.log(`check:copy: ${files.length} files read as written by a person`)
}
