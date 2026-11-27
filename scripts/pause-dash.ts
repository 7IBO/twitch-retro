// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
// The dash used as a pause, one rule for every check: check:copy (the
// interface's texts), check:dashes (the docs) and the commit-msg hook
// (a commit's message, a pull request's title and body).

/** A quote, a code span or a quoted name: its words are not ours. */
export const QUOTED = /`[^`]*`|"[^"]*"|“[^”]*”|«[^»]*»/g

const SPACE = /[\s\u00a0\u202f]/

/**
 * Whether `line` uses a dash as a pause: the long dash anywhere, or an en
 * dash with a space on each side that does not stand between two numbers
 * ("5 – 15 h", "19 – 25 Sept"). The text around an interpolation counts as
 * a number, so that a message's `range: (a, b) => …` stays; `code` refuses an
 * en dash between two interpolations unless the line is that range.
 */
export function hasPause(line: string, { code = false } = {}): boolean {
  if (line.includes("—")) return true
  for (let i = line.indexOf("–"); i !== -1; i = line.indexOf("–", i + 1)) {
    // The line's edge counts as a space: a dash that opens or ends a line
    // is a pause cut by the wrap.
    if (!SPACE.test(line[i - 1] ?? " ") || !SPACE.test(line[i + 1] ?? " "))
      continue
    const before = line.slice(0, i).trimEnd().at(-1)
    const after = line.slice(i + 1).trimStart()[0]
    const numberBefore = before === undefined || /[\d}]/.test(before)
    const numberAfter = after === undefined || /[\d$]/.test(after)
    if (!numberBefore || !numberAfter) return true
    if (code && before === "}" && after === "$" && !/\brange\b/.test(line))
      return true
  }
  return false
}

/** The lines of a text that use a dash as a pause, outside quotes and code blocks. */
export function pauseLines(text: string): { line: number; text: string }[] {
  const found: { line: number; text: string }[] = []
  /** The fence that opened the current code block, closed only by its like. */
  let fence: string | null = null
  text.split("\n").forEach((line, i) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
    if (marker && (fence === null || marker.startsWith(fence))) {
      fence = fence === null ? marker : null
      return
    }
    if (fence === null && hasPause(line.replace(QUOTED, "")))
      found.push({ line: i + 1, text: line.trim() })
  })
  return found
}
